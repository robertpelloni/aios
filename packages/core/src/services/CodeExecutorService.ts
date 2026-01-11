/**
 * AIOS Code Executor Service
 * Secure sandboxed execution of user code with MCP tool access
 * 
 * Features:
 * - Isolated execution using isolated-vm (V8 isolates)
 * - MCP context injection (mcp.call for tool access)
 * - Configurable memory and timeout limits
 * - Console capture for debugging
 * - Support for async/await in user code
 */

import { EventEmitter } from 'events';
import * as ivm from 'isolated-vm';

// ============================================
// Types
// ============================================

export interface ExecutionOptions {
    /** Timeout in milliseconds (default: 30000) */
    timeoutMs?: number;
    /** Memory limit in MB (default: 128) */
    memoryLimitMb?: number;
    /** Script ID for tracking (optional) */
    scriptId?: string;
    /** Additional context variables to inject */
    context?: Record<string, unknown>;
}

export interface ExecutionResult {
    success: boolean;
    result?: unknown;
    error?: string;
    logs: string[];
    durationMs: number;
    memoryUsed?: number;
}

export type ToolCallCallback = (
    toolName: string,
    args: Record<string, unknown>
) => Promise<{ success: boolean; content?: unknown; error?: string }>;

// ============================================
// CodeExecutorService Class
// ============================================

export class CodeExecutorService extends EventEmitter {
    private defaultTimeoutMs: number;
    private defaultMemoryLimitMb: number;

    constructor(options?: { defaultTimeoutMs?: number; defaultMemoryLimitMb?: number }) {
        super();
        this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 30000;
        this.defaultMemoryLimitMb = options?.defaultMemoryLimitMb ?? 128;
    }

    /**
     * Execute JavaScript/TypeScript code in a secure sandbox
     * 
     * @param code - The code to execute
     * @param callTool - Callback for MCP tool calls from within the sandbox
     * @param options - Execution options
     */
    async executeCode(
        code: string,
        callTool: ToolCallCallback,
        options: ExecutionOptions = {}
    ): Promise<ExecutionResult> {
        const startTime = Date.now();
        const logs: string[] = [];
        const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
        const memoryLimitMb = options.memoryLimitMb ?? this.defaultMemoryLimitMb;

        let isolate: ivm.Isolate | null = null;
        let context: ivm.Context | null = null;

        try {
            // Create isolate with memory limit
            isolate = new ivm.Isolate({ memoryLimit: memoryLimitMb });
            context = await isolate.createContext();

            const jail = context.global;
            await jail.set('global', jail.derefInto());

            // Inject console.log
            const logCallback = new ivm.Reference((msg: string) => {
                logs.push(msg);
                this.emit('log', { scriptId: options.scriptId, message: msg });
            });
            await jail.set('__log', logCallback);
            await context.eval(`
                const console = {
                    log: (...args) => __log.apply(undefined, [args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')]),
                    info: (...args) => __log.apply(undefined, ['[INFO] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')]),
                    warn: (...args) => __log.apply(undefined, ['[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')]),
                    error: (...args) => __log.apply(undefined, ['[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')])
                };
            `);

            // Inject MCP tool calling capability
            const toolCallback = new ivm.Reference(async (toolName: string, argsJson: string) => {
                try {
                    const args = JSON.parse(argsJson);
                    this.emit('tool:calling', { scriptId: options.scriptId, toolName, args });
                    
                    const result = await callTool(toolName, args);
                    
                    this.emit('tool:called', { 
                        scriptId: options.scriptId, 
                        toolName, 
                        success: result.success 
                    });
                    
                    return JSON.stringify(result);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    return JSON.stringify({ success: false, error: errorMsg });
                }
            });
            await jail.set('__callTool', toolCallback);
            
            // Create the mcp helper object
            await context.eval(`
                const mcp = {
                    call: async (toolName, args = {}) => {
                        const resultJson = await __callTool.apply(undefined, [toolName, JSON.stringify(args)], { result: { promise: true } });
                        const result = JSON.parse(resultJson);
                        if (!result.success) {
                            throw new Error(result.error || 'Tool call failed');
                        }
                        return result.content;
                    }
                };
            `);

            // Inject additional context variables if provided
            if (options.context) {
                for (const [key, value] of Object.entries(options.context)) {
                    await jail.set(key, new ivm.ExternalCopy(value).copyInto());
                }
            }

            // Wrap code in async IIFE to support top-level await
            const wrappedCode = `
                (async () => {
                    ${code}
                })();
            `;

            // Compile and run
            const script = await isolate.compileScript(wrappedCode);
            const resultRef = await script.run(context, { 
                timeout: timeoutMs,
                promise: true 
            });

            // Extract result
            let result: unknown;
            if (resultRef && typeof resultRef === 'object' && 'copy' in resultRef) {
                result = (resultRef as ivm.Reference<unknown>).copy();
            } else {
                result = resultRef;
            }

            const durationMs = Date.now() - startTime;
            const memoryUsed = isolate.getHeapStatisticsSync().used_heap_size;

            this.emit('execution:complete', {
                scriptId: options.scriptId,
                success: true,
                durationMs
            });

            return {
                success: true,
                result,
                logs,
                durationMs,
                memoryUsed
            };

        } catch (error) {
            const durationMs = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);

            // Handle timeout specifically
            const isTimeout = errorMsg.includes('Script execution timed out');

            this.emit('execution:error', {
                scriptId: options.scriptId,
                error: errorMsg,
                isTimeout,
                durationMs
            });

            return {
                success: false,
                error: isTimeout ? `Execution timed out after ${timeoutMs}ms` : errorMsg,
                logs,
                durationMs
            };

        } finally {
            // Clean up resources
            if (context) {
                context.release();
            }
            if (isolate) {
                isolate.dispose();
            }
        }
    }

    /**
     * Execute code with a simple string result (for CLI/simple use cases)
     */
    async executeSimple(
        code: string,
        callTool: ToolCallCallback,
        options: ExecutionOptions = {}
    ): Promise<string> {
        const result = await this.executeCode(code, callTool, options);
        
        if (!result.success) {
            return `Error: ${result.error}`;
        }

        const output: string[] = [];
        
        if (result.logs.length > 0) {
            output.push(...result.logs);
        }
        
        if (result.result !== undefined) {
            output.push(`Result: ${JSON.stringify(result.result, null, 2)}`);
        }

        return output.join('\n') || 'Execution completed (no output)';
    }

    /**
     * Validate code syntax without executing
     */
    async validateSyntax(code: string): Promise<{ valid: boolean; error?: string }> {
        let isolate: ivm.Isolate | null = null;

        try {
            isolate = new ivm.Isolate({ memoryLimit: 8 }); // Minimal memory for syntax check
            
            const wrappedCode = `(async () => { ${code} })();`;
            await isolate.compileScript(wrappedCode);
            
            return { valid: true };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return { valid: false, error: errorMsg };
        } finally {
            if (isolate) {
                isolate.dispose();
            }
        }
    }

    /**
     * Get available MCP tools documentation for injection into prompts
     */
    getToolHelperDocs(): string {
        return `
// MCP Tool Helper
// Use mcp.call(toolName, args) to call MCP tools from your script

// Example usage:
const files = await mcp.call('list_files', { path: '/project' });
console.log('Files:', files);

const content = await mcp.call('read_file', { path: '/project/README.md' });
console.log('Content:', content);

// Tool calls return the content directly, or throw on error
try {
    const result = await mcp.call('some_tool', { arg1: 'value' });
} catch (error) {
    console.error('Tool call failed:', error.message);
}
        `.trim();
    }
}

// Export singleton factory
let instance: CodeExecutorService | null = null;

export function getCodeExecutorService(options?: { 
    defaultTimeoutMs?: number; 
    defaultMemoryLimitMb?: number 
}): CodeExecutorService {
    if (!instance) {
        instance = new CodeExecutorService(options);
    }
    return instance;
}
