import { LLMService } from "../ai/LLMService.js";
import { v4 as uuidv4 } from "uuid";
const AGENT_TEMPLATES = [
    {
        type: 'code',
        name: 'CodeAgent',
        systemPrompt: `You are a specialized code-writing AI assistant.
Your ONLY job is to produce high-quality, working code.
- Write clean, well-commented code
- Follow best practices for the language/framework
- If you need to make assumptions, state them clearly
- Return ONLY code blocks with minimal explanation`
    },
    {
        type: 'research',
        name: 'ResearchAgent',
        systemPrompt: `You are a research specialist AI.
Your job is to gather, synthesize, and summarize information.
- Search broadly, then focus on relevant details
- Cite sources when possible
- Structure your findings clearly
- Highlight key insights and actionable recommendations`
    },
    {
        type: 'reviewer',
        name: 'ReviewerAgent',
        systemPrompt: `You are a code review and security specialist.
Your job is to identify issues and suggest improvements.
- Look for bugs, security vulnerabilities, and code smells
- Check for performance issues
- Suggest improvements with specific examples
- Rate severity: Critical, Warning, or Suggestion`
    }
];
export class Spawner {
    activeAgents = new Map();
    llmService;
    modelSelector;
    constructor(modelSelector) {
        this.llmService = new LLMService();
        this.modelSelector = modelSelector;
    }
    /**
     * Spawn a new sub-agent with a specific task
     */
    async spawn(type, task, customPrompt) {
        const template = AGENT_TEMPLATES.find(t => t.type === type);
        const agent = {
            id: uuidv4(),
            type,
            name: template?.name || 'CustomAgent',
            systemPrompt: customPrompt || template?.systemPrompt || 'You are a helpful assistant.',
            status: 'idle',
            task,
            createdAt: new Date()
        };
        this.activeAgents.set(agent.id, agent);
        console.log(`[Spawner] 🐣 Spawned ${agent.name} (${agent.id}) for task: "${task.substring(0, 50)}..."`);
        // Start working in background
        this.runAgent(agent);
        return agent;
    }
    /**
     * Run the agent's task asynchronously
     */
    async runAgent(agent) {
        const agentRef = this.activeAgents.get(agent.id);
        if (!agentRef)
            return;
        agentRef.status = 'working';
        console.log(`[Spawner] ⚙️ ${agent.name} started working...`);
        try {
            // Select appropriate model (prefer fast local models for sub-agents)
            const model = await this.modelSelector.selectModel({
                taskComplexity: 'low', // Sub-agents get faster models
                taskType: 'worker'
            });
            const response = await this.llmService.generateText(model.provider, model.modelId, agent.systemPrompt, agent.task);
            agentRef.result = response.content;
            agentRef.status = 'done';
            console.log(`[Spawner] ✅ ${agent.name} completed task.`);
        }
        catch (e) {
            agentRef.status = 'error';
            agentRef.result = `Error: ${e.message}`;
            console.error(`[Spawner] ❌ ${agent.name} failed:`, e.message);
        }
    }
    /**
     * Kill a running agent
     */
    killAgent(id) {
        const agent = this.activeAgents.get(id);
        if (agent) {
            this.activeAgents.delete(id);
            console.log(`[Spawner] 🔪 Killed ${agent.name} (${id})`);
            return true;
        }
        return false;
    }
    /**
     * List all active agents
     */
    listAgents() {
        return Array.from(this.activeAgents.values());
    }
    /**
     * Get status of a specific agent
     */
    getAgentStatus(id) {
        return this.activeAgents.get(id) || null;
    }
    /**
     * Wait for an agent to complete
     */
    async waitForAgent(id, timeoutMs = 30000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const agent = this.activeAgents.get(id);
            if (!agent)
                return null;
            if (agent.status === 'done' || agent.status === 'error') {
                return agent;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return this.activeAgents.get(id) || null;
    }
    /**
     * Get available agent templates
     */
    getTemplates() {
        return AGENT_TEMPLATES;
    }
}
/**
 * Spawner Tools for Director integration
 */
export const SpawnerTools = (spawner) => [
    {
        name: "spawn_agent",
        description: "Spawn a specialized sub-agent to work on a specific task in parallel",
        inputSchema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["code", "research", "reviewer", "custom"],
                    description: "Type of agent to spawn"
                },
                task: { type: "string", description: "The task for the agent to complete" },
                customPrompt: { type: "string", description: "Optional custom system prompt (for 'custom' type)" }
            },
            required: ["type", "task"]
        },
        handler: async (args) => {
            const agent = await spawner.spawn(args.type, args.task, args.customPrompt);
            return {
                content: [{
                        type: "text",
                        text: `Spawned ${agent.name} (ID: ${agent.id}). Status: ${agent.status}. Use 'get_agent_result' with this ID to check results.`
                    }]
            };
        }
    },
    {
        name: "list_agents",
        description: "List all active sub-agents and their status",
        inputSchema: { type: "object", properties: {} },
        handler: async () => {
            const agents = spawner.listAgents();
            if (agents.length === 0) {
                return { content: [{ type: "text", text: "No active sub-agents." }] };
            }
            const summary = agents.map(a => `- ${a.name} (${a.id}): ${a.status} | Task: "${a.task.substring(0, 40)}..."`).join('\n');
            return { content: [{ type: "text", text: `Active Agents:\n${summary}` }] };
        }
    },
    {
        name: "get_agent_result",
        description: "Get the result from a completed sub-agent",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "Agent ID" },
                wait: { type: "boolean", description: "Wait for agent to complete (max 30s)" }
            },
            required: ["id"]
        },
        handler: async (args) => {
            let agent = spawner.getAgentStatus(args.id);
            if (!agent) {
                return { content: [{ type: "text", text: `Agent ${args.id} not found.` }] };
            }
            if (args.wait && agent.status === 'working') {
                agent = await spawner.waitForAgent(args.id);
            }
            if (!agent) {
                return { content: [{ type: "text", text: `Agent ${args.id} not found after waiting.` }] };
            }
            return {
                content: [{
                        type: "text",
                        text: `Agent: ${agent.name}\nStatus: ${agent.status}\n\nResult:\n${agent.result || "(No result yet)"}`
                    }]
            };
        }
    },
    {
        name: "kill_agent",
        description: "Terminate a running sub-agent",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "Agent ID to kill" }
            },
            required: ["id"]
        },
        handler: async (args) => {
            const killed = spawner.killAgent(args.id);
            return {
                content: [{
                        type: "text",
                        text: killed ? `Agent ${args.id} terminated.` : `Agent ${args.id} not found.`
                    }]
            };
        }
    }
];
