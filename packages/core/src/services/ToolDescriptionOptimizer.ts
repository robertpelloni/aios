import { ModelGateway } from '../gateway/ModelGateway.js';
import { ToolDefinition } from './ToolSearchService.js';
import { DatabaseManager } from '../db/DatabaseManager.js';

export class ToolDescriptionOptimizer {
    private cache: Map<string, string> = new Map();
    private db: DatabaseManager;

    constructor(private modelGateway: ModelGateway) {
        this.db = DatabaseManager.getInstance();
    }

    /**
     * Optimizes a tool description for LLM consumption.
     * Rewrites it to be concise, action-oriented, and focused on *when* to use it.
     */
    async optimizeDescription(tool: ToolDefinition): Promise<string> {
        // Check memory cache
        if (this.cache.has(tool.name)) {
            return this.cache.get(tool.name)!;
        }

        // Check DB cache (if we store it there, maybe in customMetadata or a new field)
        // For now, let's just use memory + simple file persistence if needed, 
        // but since we have a DB, let's try to use it or just rely on memory for this session.
        // Actually, let's just use memory for now to keep it simple and fast.
        
        // If description is already short, don't optimize
        if (!tool.description || tool.description.length < 100) {
            return tool.description || '';
        }

        try {
            const prompt = `
You are an expert at optimizing tool definitions for AI agents.
Rewrite the following tool description to be concise, clear, and focused on WHEN and HOW to use it.
Avoid fluff. Focus on the capability and constraints.
Keep it under 50 words if possible.

Tool Name: ${tool.name}
Original Description:
${tool.description}

Optimized Description:
`;
            const optimized = await this.modelGateway.chat([
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
            ], 'gpt-4o-mini'); // Use a cheaper model for this

            const result = optimized.trim();
            this.cache.set(tool.name, result);
            return result;
        } catch (error) {
            console.warn(`[ToolOptimizer] Failed to optimize ${tool.name}:`, error);
            return tool.description || '';
        }
    }

    /**
     * Optimizes a list of tools in parallel.
     */
    async optimizeTools(tools: ToolDefinition[]): Promise<ToolDefinition[]> {
        const optimized = await Promise.all(tools.map(async t => {
            const newDesc = await this.optimizeDescription(t);
            return { ...t, description: newDesc };
        }));
        return optimized;
    }
}
