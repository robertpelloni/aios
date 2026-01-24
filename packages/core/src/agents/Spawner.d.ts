import { ModelSelector } from "../ModelSelector.js";
export interface SubAgent {
    id: string;
    type: 'code' | 'research' | 'reviewer' | 'custom';
    name: string;
    systemPrompt: string;
    status: 'idle' | 'working' | 'done' | 'error';
    task: string;
    result?: string;
    createdAt: Date;
}
interface AgentTemplate {
    type: SubAgent['type'];
    name: string;
    systemPrompt: string;
}
export declare class Spawner {
    private activeAgents;
    private llmService;
    private modelSelector;
    constructor(modelSelector: ModelSelector);
    /**
     * Spawn a new sub-agent with a specific task
     */
    spawn(type: SubAgent['type'], task: string, customPrompt?: string): Promise<SubAgent>;
    /**
     * Run the agent's task asynchronously
     */
    private runAgent;
    /**
     * Kill a running agent
     */
    killAgent(id: string): boolean;
    /**
     * List all active agents
     */
    listAgents(): SubAgent[];
    /**
     * Get status of a specific agent
     */
    getAgentStatus(id: string): SubAgent | null;
    /**
     * Wait for an agent to complete
     */
    waitForAgent(id: string, timeoutMs?: number): Promise<SubAgent | null>;
    /**
     * Get available agent templates
     */
    getTemplates(): AgentTemplate[];
}
/**
 * Spawner Tools for Director integration
 */
export declare const SpawnerTools: (spawner: Spawner) => ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            type: {
                type: string;
                enum: string[];
                description: string;
            };
            task: {
                type: string;
                description: string;
            };
            customPrompt: {
                type: string;
                description: string;
            };
            id?: undefined;
            wait?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        type: SubAgent["type"];
        task: string;
        customPrompt?: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            type?: undefined;
            task?: undefined;
            customPrompt?: undefined;
            id?: undefined;
            wait?: undefined;
        };
        required?: undefined;
    };
    handler: () => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            id: {
                type: string;
                description: string;
            };
            wait: {
                type: string;
                description: string;
            };
            type?: undefined;
            task?: undefined;
            customPrompt?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        id: string;
        wait?: boolean;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            id: {
                type: string;
                description: string;
            };
            type?: undefined;
            task?: undefined;
            customPrompt?: undefined;
            wait?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
export {};
//# sourceMappingURL=Spawner.d.ts.map