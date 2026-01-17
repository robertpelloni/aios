import { McpProxyManager } from '../managers/McpProxyManager.js';
import { SecretManager } from '../managers/SecretManager.js';
import { ModelGateway } from '../gateway/ModelGateway.js';
import { SystemPromptManager } from '../managers/SystemPromptManager.js';
import { SessionManager } from '../managers/SessionManager.js';
import { PolicyService } from '../services/PolicyService.js';
import { ToolDisclosureService } from '../services/ToolDisclosureService.js';

export class AgentExecutor {
    private modelGateway: ModelGateway;
    private toolDisclosureService?: ToolDisclosureService;

    constructor(
        private proxyManager: McpProxyManager,
        private secretManager: SecretManager,
        private sessionManager?: SessionManager,
        private systemPromptManager?: SystemPromptManager,
        private policyService?: PolicyService
    ) {
        this.modelGateway = new ModelGateway(secretManager);
    }

    setToolDisclosureService(service: ToolDisclosureService) {
        this.toolDisclosureService = service;
    }

    async run(agent: any, task: string, context: any = {}, sessionId: string) {
        console.log(`[AgentExecutor] Running ${agent.name} on task: ${task}`);

        // 0. Secret Scoping
        const agentScope = `agent:${agent.id || agent.name}`;
        const scopedSecrets = this.secretManager.getEnvVars(agentScope);
        const globalSecrets = this.secretManager.getEnvVars('*');
        const env = { ...globalSecrets, ...scopedSecrets };

        // Enforcement of Guardrails for initial run
        if (this.policyService) {
            const evaluation = this.policyService.evaluate({
                toolName: 'agent:run',
                agentId: agent.id || agent.name,
                actionType: 'execute'
            });

            if (!evaluation.allowed) {
                throw new Error(`Execution blocked by policy: ${evaluation.reason}`);
            }
        }

        // 1. Construct System Prompt
        const globalSystem = this.systemPromptManager?.getPrompt() || "";
        const userInstructions = this.systemPromptManager?.getUserInstructions('default') || ""; // Todo: get active profile

        let tools;
        if (this.toolDisclosureService) {
            // Dynamic Tool Disclosure
            console.log(`[AgentExecutor] Using dynamic tool disclosure for task: ${task.substring(0, 50)}...`);
            tools = await this.toolDisclosureService.getToolsForContext(task, {
                maxTools: 20,
                pinnedTools: ['remember', 'search_memory', 'recall_recent', 'save_handoff', 'run_subagent'], // Always available
                optimizeDescriptions: true // Enable semantic optimization
            });
        } else {
            // Fallback to all tools
            tools = await this.proxyManager.getAllTools();
        }

        const toolsPrompt = tools.map((t: any) => `- ${t.name}: ${t.description}`).join('\n');

        const systemPrompt = `
${globalSystem}

---
USER INSTRUCTIONS:
${userInstructions}

---
AGENT: ${agent.name}
${agent.description}
${agent.instructions}

AVAILABLE TOOLS:
${toolsPrompt}

To use a tool, respond with:
TOOL: tool_name
ARGS: { "arg1": "value" }
SANDBOX: docker | wasm (optional)

When you have the final answer, respond with:
ANSWER: your final answer
`;

        // 2. Initial Message
        const messages = [
            { role: 'system', content: systemPrompt.trim() },
            { role: 'user', content: task }
        ];

        let loopCount = 0;
        const maxLoops = 10;
        let totalTokens = 0;

        while (loopCount < maxLoops) {
            loopCount++;
            
            const response = await this.modelGateway.chat(messages as any, agent.model);
            messages.push({ role: 'assistant', content: response });
            
            // Simple token estimation (approx 4 chars per token)
            const responseTokens = Math.ceil(response.length / 4);
            totalTokens += responseTokens;

            if (response.includes('ANSWER:')) {
                const answer = response.split('ANSWER:')[1].trim();
                this.saveSession(sessionId, agent.name, messages);
                return answer;
            }

            if (response.includes('TOOL:')) {
                const lines = response.split('\n');
                const toolLine = lines.find(l => l.startsWith('TOOL:'));
                const argsLine = lines.find(l => l.startsWith('ARGS:'));
                const sandboxLine = lines.find(l => l.startsWith('SANDBOX:'));

                if (toolLine && argsLine) {
                    const toolName = toolLine.replace('TOOL:', '').trim();
                    const argsStr = argsLine.replace('ARGS:', '').trim();
                    const sandboxType = sandboxLine ? sandboxLine.replace('SANDBOX:', '').trim() : null;
                    
                    try {
                        const args = JSON.parse(argsStr);
                        
                        // Policy Enforcement for Tool Use
                        if (this.policyService) {
                            const actionType = this.inferActionType(toolName);
                            const evaluation = this.policyService.evaluate({
                                toolName,
                                agentId: agent.id || agent.name,
                                actionType,
                                taskTokens: totalTokens
                            });

                            if (!evaluation.allowed) {
                                const errorMsg = `Policy Blocked: ${evaluation.reason}`;
                                messages.push({ role: 'user', content: errorMsg });
                                continue;
                            }
                        }

                        console.log(`[AgentExecutor] Calling tool ${toolName} with args:`, args);
                        
                        let result;
                        if (sandboxType === 'docker' || sandboxType === 'wasm') {
                            console.log(`[AgentExecutor] Sandboxing tool ${toolName} via ${sandboxType}`);
                            // Wrap result with sandbox info
                            const originalResult = await this.proxyManager.callTool(toolName, args);
                            result = {
                                _sandbox: sandboxType,
                                ...originalResult
                            };
                        } else {
                            result = await this.proxyManager.callTool(toolName, args);
                        }

                        messages.push({ role: 'user', content: `TOOL RESULT: ${JSON.stringify(result)}` });
                    } catch (e: any) {
                        messages.push({ role: 'user', content: `ERROR: ${e.message}` });
                    }
                } else {
                    messages.push({ role: 'user', content: "Invalid tool call format. Use TOOL: name and ARGS: {json}" });
                }
            } else {
                // If neither ANSWER nor TOOL, the agent might be just talking.
                // We'll give it one more chance or treat it as a partial answer.
                if (loopCount === maxLoops) break;
            }
        }

        const finalResponse = messages[messages.length - 1].content;
        this.saveSession(sessionId, agent.name, messages);
        return finalResponse;
    }

    private inferActionType(toolName: string): string {
        const name = toolName.toLowerCase();
        if (name.includes('delete') || name.includes('remove') || name.includes('rm')) return 'delete';
        if (name.includes('write') || name.includes('save') || name.includes('create') || name.includes('update') || name.includes('set')) return 'write';
        if (name.includes('read') || name.includes('get') || name.includes('list') || name.includes('search') || name.includes('show')) return 'read';
        return 'execute';
    }

    private saveSession(sessionId: string, agentName: string, messages: any[]) {
        if (this.sessionManager) {
            const formattedMessages = messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: Date.now()
            }));
            this.sessionManager.saveSession(sessionId, agentName, formattedMessages);
        }
    }
}

