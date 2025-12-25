import { EventEmitter } from 'events';
import { McpProxyManager } from '../managers/McpProxyManager.js';
import { AgentDefinition } from '../types.js';
import { SecretManager } from '../managers/SecretManager.js';
import { ModelGateway } from '../gateway/ModelGateway.js';

export class AgentExecutor extends EventEmitter {
    private gateway: ModelGateway;

    constructor(
        private proxyManager: McpProxyManager,
        private secretManager: SecretManager
    ) {
        super();
        this.gateway = new ModelGateway(secretManager);
    }

    /**
     * Updates the gateway configuration.
     */
    configureModel(provider: 'openai' | 'anthropic' | 'ollama', model: string) {
        this.gateway.setProvider(provider, model);
    }

    async run(agent: AgentDefinition, task: string, context: any = {}) {
        this.emit('start', { agent: agent.name, task });

        // Use agent-specific model if defined, otherwise use Gateway defaults
        // Note: Currently ModelGateway is stateful global, but we could pass config per request
        // For now, we assume the gateway is configured via Profile or Defaults.

        const messages: any[] = [
            { role: 'system', content: `You are ${agent.name}. ${agent.description}\n\nInstructions:\n${agent.instructions}\n\nYou have access to tools. Use them to answer the user request.` },
            { role: 'user', content: task }
        ];

        let iterations = 0;
        const maxIterations = 10;
        const sessionId = `agent-${agent.name}-${Date.now()}`;

        while (iterations < maxIterations) {
            iterations++;
            console.log(`[AgentExecutor] Iteration ${iterations}`);

            try {
                // 1. Get Tools
                const tools = await this.proxyManager.getAllTools(sessionId);

                const formattedTools = tools.map(t => ({
                    type: 'function',
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.inputSchema || {}
                    }
                }));

                // 2. Call LLM via Gateway
                const response = await this.gateway.complete({
                    system: `You are ${agent.name}. ${agent.description}`,
                    messages: messages,
                    tools: formattedTools,
                });

                // Add assistant response to history
                // Note: The Gateway normalization simplifies the message object,
                // but for tool use chains we need to be careful with history format.
                // OpenAI expects the tool_calls object on the assistant message.
                const assistantMsg: any = { role: 'assistant', content: response.content };
                if (response.toolCalls) {
                    assistantMsg.tool_calls = response.toolCalls;
                }
                messages.push(assistantMsg);

                // 3. Handle Tool Calls
                if (response.toolCalls && response.toolCalls.length > 0) {
                    for (const toolCall of response.toolCalls) {
                        const name = toolCall.function.name;
                        const args = JSON.parse(toolCall.function.arguments);

                        this.emit('tool_call', { name, args });
                        console.log(`[AgentExecutor] Calling ${name}`, args);

                        let result;
                        try {
                            const res = await this.proxyManager.callTool(name, args, sessionId);
                            result = typeof res === 'string' ? res : JSON.stringify(res);
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
                    // 4. Final Answer
                    const content = response.content;
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
