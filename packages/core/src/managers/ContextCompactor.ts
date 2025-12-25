import { AgentExecutor } from '../agents/AgentExecutor.js';

export interface CompactedContext {
    summary: string;
    facts: string[];
    decisions: string[];
    actionItems: string[];
}

export class ContextCompactor {
    constructor(private agentExecutor: AgentExecutor) {}

    async compact(content: string, type: 'conversation' | 'tool_output' = 'conversation'): Promise<CompactedContext> {
        const prompt = `
        Analyze the following ${type} content and extract key information.
        Return a JSON object with the following keys:
        - summary: A concise summary of what happened (max 2 sentences).
        - facts: A list of factual statements or user preferences discovered.
        - decisions: A list of technical or product decisions made.
        - actionItems: A list of tasks or follow-ups identified.

        Content:
        """
        ${content.substring(0, 8000)} 
        """
        
        Output JSON only.
        `;

        try {
            const result = await this.agentExecutor.run({
                name: "ContextCompactor",
                description: "Compacts raw text into structured memory.",
                instructions: "You are a precise data extractor. Output valid JSON only.",
                model: "gpt-4-turbo" // Or configurable
            }, prompt);

            if (!result) {
                return { summary: "No result from agent", facts: [], decisions: [], actionItems: [] };
            }

            // Attempt to parse JSON
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { summary: result, facts: [], decisions: [], actionItems: [] };
        } catch (e) {
            console.error("Context compaction failed:", e);
            return { summary: "Failed to compact context.", facts: [], decisions: [], actionItems: [] };
        }
    }
}
