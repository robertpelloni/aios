import vm from 'vm';
import { SandboxService } from '../services/SandboxService.js';

export class CodeExecutionManager {
    constructor(private sandboxService?: SandboxService) {}

    async execute(code: string, toolCallback: (name: string, args: any) => Promise<any>, runtime: 'node' | 'python' | 'wasm' = 'node') {
        if (runtime === 'python') {
            if (!this.sandboxService) throw new Error("SandboxService not initialized.");
            const { stdout, stderr, exitCode } = await this.sandboxService.run(['python3', '-c', code], { runtime: 'docker', image: 'python:3.10-slim' });
            if (exitCode !== 0) throw new Error(`Python Error: ${stderr}`);
            return stdout;
        }

        if (runtime === 'wasm') {
            if (!this.sandboxService) throw new Error("SandboxService not initialized.");
            const { stdout, stderr, exitCode } = await this.sandboxService.run([code], { runtime: 'wasm' });
            if (exitCode !== 0) throw new Error(`WASM Error: ${stderr}`);
            return stdout;
        }

        // Node.js Execution (vm)
        const context = {
            console: {
                log: (...args: any[]) => console.log('[Sandbox]', ...args),
                error: (...args: any[]) => console.error('[Sandbox]', ...args)
            },
            call_tool: async (name: string, args: any) => {
                return await toolCallback(name, args);
            }
        };

        vm.createContext(context);

        // Wrap code in async IIFE to allow await
        const wrappedCode = `
            (async () => {
                try {
                    ${code}
                } catch (e) {
                    return e.message;
                }
            })();
        `;

        try {
            const result = await vm.runInContext(wrappedCode, context, { timeout: 5000 });
            return result;
        } catch (e: any) {
            return `Execution Error: ${e.message}`;
        }
    }

    async executePythonScript(script: string, args: string[]): Promise<string> {
        if (!this.sandboxService) throw new Error("SandboxService not initialized");
        const { stdout, stderr, exitCode } = await this.sandboxService.run(['python3', '-c', script, ...args], { runtime: 'docker', image: 'python:3.10-slim' });
        if (exitCode !== 0) throw new Error(`Python Script Error: ${stderr}`);
        return stdout;
    }
}
