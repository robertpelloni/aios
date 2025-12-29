import { EventEmitter } from 'events';
import { McpProxyManager } from '../managers/McpProxyManager.js';
import { AgentDefinition } from '../types.js';
import OpenAI from 'openai';
import { SecretManager } from '../managers/SecretManager.js';
import { LogManager } from '../managers/LogManager.js';
import { ContextAnalyzer } from '../utils/ContextAnalyzer.js';
import { ContextManager } from '../managers/ContextManager.js';
import { MemoryManager } from '../managers/MemoryManager.js';
import { ContextCompactor } from '../managers/ContextCompactor.js';

export class AgentExecutor extends EventEmitter {
    private openai: OpenAI | null = null;
    private messageCountSinceReflect = 0;
    private readonly REFLECTION_THRESHOLD = 5;

    constructor(
        private proxyManager: McpProxyManager,
        private secretManager?: SecretManager,
        private logManager?: LogManager,
        private contextManager?: ContextManager,
        private memoryManager?: MemoryManager
    ) {
        super();
        this.initializeOpenAI();
    }


    private async performReflection(messages: any[]) {
        if (!this.memoryManager) return;

        try {
            // 1. Extract recent history
            const recentHistory = messages
                .slice(-this.REFLECTION_THRESHOLD * 2) // Rough estimate of messages
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');

            // 2. Compact using a temporary compactor instance
            // We pass 'this' (the executor) to the compactor, but we must be careful about recursion.
            // The compactor uses a specific agent name "ContextCompactor".
            const compactor = new ContextCompactor(this, this.memoryManager);
            const compacted = await compactor.compact(recentHistory, 'conversation');

            // 3. Save as a "Session Summary" memory
            if (compacted.summary) {
                await this.memoryManager.remember({
                    content: `[Auto-Reflection] ${compacted.summary}`,
                    tags: ['reflection', 'auto-summary']
                });
                console.log(`[AgentExecutor] Reflected and saved summary: ${compacted.summary}`);
            }

            // Optional: We could prune messages here, but that's risky without more logic.
        } catch (e) {
            console.error("[AgentExecutor] Reflection failed:", e);
        }
    }

    public setMemoryManager(memoryManager: MemoryManager) {

        this.memoryManager = memoryManager;
    }

    private initializeOpenAI() {
        if (this.secretManager) {
            const apiKey = this.secretManager.getSecret('OPENAI_API_KEY');
            if (apiKey) {
                this.openai = new OpenAI({ apiKey });
                console.log('[AgentExecutor] OpenAI initialized with key from SecretManager');
            }
        }
    }

    async run(agent: AgentDefinition, task: string, context: any = {}) {
        this.emit('start', { agent: agent.name, task });

        // Re-init in case key was added late
        if (!this.openai) this.initializeOpenAI();

        if (!this.openai) {
            this.emit('error', "No OpenAI API Key found. Please add OPENAI_API_KEY to Secrets.");
            return "Error: No OpenAI API Key found.";
        }

        // --- Layer 1: System (Identity & Core Instructions) ---
        let systemPrompt = `You are ${agent.name}. ${agent.description}\n\nInstructions:\n${agent.instructions}\n\n`;
        systemPrompt += `You have access to tools. Use them to answer the user request.\n`;

        // --- Layer 2: Dev (Project Context) ---
        if (this.contextManager) {
            const contextFiles = this.contextManager.getContextFiles();
            if (contextFiles.length > 0) {
                systemPrompt += `\n## Project Context\n`;
                // Limit context size? For now, dump it all (assuming small files like .cursorrules)
                contextFiles.forEach(f => {
                    systemPrompt += `\n### ${f.name}\n${f.content}\n`;
                });
            }
        }

        // --- Layer 3: Session (Memory & History) ---
        // If we have relevant memories passed in context, inject them
        if (context.memories && Array.isArray(context.memories)) {
            systemPrompt += `\n## Relevant Memories\n`;
            context.memories.forEach((m: any) => {
                systemPrompt += `- ${m.content}\n`;
            });
        }

        const messages: any[] = [
            { role: 'system', content: systemPrompt },
            // --- Layer 4: User (The Task) ---
            { role: 'user', content: task }
        ];

        let iterations = 0;
        const maxIterations = 10;
        this.messageCountSinceReflect = 0; // Reset per run

        while (iterations < maxIterations) {
            iterations++;
            console.log(`[AgentExecutor] Iteration ${iterations}`);
            
            // --- Auto-Reflection Logic ---
            if (this.memoryManager && this.messageCountSinceReflect >= this.REFLECTION_THRESHOLD) {
                console.log(`[AgentExecutor] Triggering Auto-Reflection (Count: ${this.messageCountSinceReflect})`);
                await this.performReflection(messages);
                this.messageCountSinceReflect = 0;
            }

            try {

                // 1. Get Tools
                // We use getAllTools() which respects progressive disclosure (meta tools)
                // BUT the agent needs to see the tools it loads.
                // The proxyManager handles session visibility if we pass a sessionId.
                // Let's use agent.name as sessionId for now to persist state across runs?
                // Or a unique run ID.
                const sessionId = `agent-${agent.name}-${Date.now()}`;
                let tools = await this.proxyManager.getAllTools(sessionId);

                // Inject Memory Tools if manager is present
                if (this.memoryManager) {
                     const memoryTools = this.memoryManager.getToolDefinitions();
                     // Filter out tools already present to avoid duplicates (though name check is primitive)
                     const existingNames = new Set(tools.map(t => t.name));
                     tools = [...tools, ...memoryTools.filter(t => !existingNames.has(t.name))];
                }

                // Map tools to OpenAI format
                const openAiTools = tools.map(t => ({
                    type: 'function',
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.inputSchema || {}
                    }
                }));

                // 2. Analyze Context
                const contextAnalysis = ContextAnalyzer.analyze(messages);
                
                // Update ContextManager with current messages state for UI visibility
                if (this.contextManager) {
                    this.contextManager.updateActiveMessages(messages);
                }

                // 3. Call LLM

                const completion = await this.openai.chat.completions.create({
                    model: agent.model || 'gpt-4-turbo',
                    messages: messages,
                    tools: openAiTools as any,
                    tool_choice: 'auto'
                });

                if (this.logManager && completion.usage) {
                    const cost = this.logManager.calculateCost(
                        agent.model || 'gpt-4-turbo', 
                        completion.usage.prompt_tokens, 
                        completion.usage.completion_tokens
                    );
                    
                    this.logManager.log({
                        type: 'response',
                        tool: 'llm_completion',
                        server: 'openai',
                        args: { 
                            model: agent.model, 
                            messagesCount: messages.length, 
                            messages,
                            contextAnalysis // Log the breakdown
                        },
                        result: { usage: completion.usage },
                        tokens: completion.usage.total_tokens,
                        cost: cost
                    });
                }

                    const message = completion.choices[0].message;
                    messages.push(message);
                    this.messageCountSinceReflect++; // Count the assistant's reply

                    // 4. Handle Tool Calls
                    if (message.tool_calls && message.tool_calls.length > 0) {
                        for (const toolCall of message.tool_calls) {
                        // @ts-ignore
                        const name = toolCall.function.name;
                        // @ts-ignore
                        const args = JSON.parse(toolCall.function.arguments);

                        this.emit('tool_call', { name, args });
                        console.log(`[AgentExecutor] Calling ${name}`, args);

                        let result;
                        try {
                            // Check local tools first (MemoryManager tools are not yet in ProxyManager except via hacky ways)
                            // We should really register MemoryManager as a proper tool provider in ProxyManager.
                            // But for now, let's intercept.
                            if (this.memoryManager && (name === 'remember' || name === 'search_memory' || name === 'ingest_content')) {
                                if (name === 'remember') result = await this.memoryManager.remember(args);
                                else if (name === 'search_memory') result = await this.memoryManager.search(args);
                                else if (name === 'ingest_content') result = await this.memoryManager.ingestSession(args.source, args.content);
                                result = JSON.stringify(result);
                                
                                // Auto-ingest tool interactions (facts/decisions)
                                // We don't ingest 'search_memory' to avoid loops, but 'remember' is interesting.
                                if (name === 'remember') {
                                     // No-op for now, as remember IS the storage mechanism
                                }

                            } else {
                                // Call via Proxy (handles local/remote/internal)
                                const res = await this.proxyManager.callTool(name, args, sessionId);
                                result = JSON.stringify(res);

                                // Auto-ingest significant interactions
                                if (this.memoryManager) {
                                    this.memoryManager.ingestInteraction(name, args, res).catch(console.error);
                                }
                            }
                        } catch (e: any) {
                            result = `Error: ${e.message}`;
                        }

                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: result
                        });
                    }
                } else {
                    // 5. Final Answer
                    const content = message.content;
                    this.emit('result', content);
                    return content;
                }

            } catch (e: any) {
                console.error('[AgentExecutor] Loop Error:', e);
                this.emit('error', e.message);
                return `Error: ${e.message}`;
            }
        }

        return "Max iterations reached.";
    }
}
