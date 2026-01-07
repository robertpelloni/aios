import { AutonomousAgent } from '../agents/AutonomousAgent.js';
import { AgentManager } from './AgentManager.js';
import { AgentMessageBroker } from './AgentMessageBroker.js';
import { McpRouter } from './McpRouter.js';
import { LogManager } from './LogManager.js';
import { SecretManager } from './SecretManager.js';

export class AutonomousAgentManager {
    private runningAgents: Map<string, AutonomousAgent> = new Map();

    constructor(
        private agentManager: AgentManager,
        private messageBroker: AgentMessageBroker,
        private mcpRouter: McpRouter,
        private logManager: LogManager,
        private secretManager: SecretManager
    ) {}

    public async startAgent(agentId: string, parentId?: string) {
        if (this.runningAgents.has(agentId)) {
            console.log(`[AutonomousAgentManager] Agent ${agentId} is already running.`);
            return;
        }

        // 1. Get Definition
        // The AgentManager stores agents by filename or ID.
        const profile = this.agentManager.registry.get(agentId);
        
        const def = profile || this.agentManager.getAgents().find(a => a.name === agentId);

        if (!def) {
             throw new Error(`Agent definition for ${agentId} not found.`);
        }

        const apiKey = this.secretManager.getSecret('OPENAI_API_KEY');
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY not found.");
        }

        const agent = new AutonomousAgent(
            agentId,
            def,
            this.messageBroker,
            this.mcpRouter,
            this.logManager,
            apiKey,
            parentId
        );

        await agent.start();
        this.runningAgents.set(agentId, agent);
        console.log(`[AutonomousAgentManager] Started agent ${agentId}`);
    }

    public stopAgent(agentId: string) {
        const agent = this.runningAgents.get(agentId);
        if (agent) {
            agent.stop();
            this.runningAgents.delete(agentId);
            console.log(`[AutonomousAgentManager] Stopped agent ${agentId}`);
        }
    }

    public getRunningAgents() {
        return Array.from(this.runningAgents.keys());
    }
}
