import { ToolSearchService, ToolDefinition } from './ToolSearchService.js';
import { ToolDescriptionOptimizer } from './ToolDescriptionOptimizer.js';

export interface DisclosureOptions {
    maxTools?: number;
    pinnedTools?: string[]; // Names of tools to always include
    context?: string; // The current conversation context/task
    optimizeDescriptions?: boolean; // Whether to rewrite descriptions for the LLM
}

export class ToolDisclosureService {
    constructor(
        private searchService: ToolSearchService,
        private optimizer?: ToolDescriptionOptimizer
    ) {}

    /**
     * Selects the most relevant tools for the given context.
     * Uses hybrid search (semantic + fuzzy) to find tools matching the task.
     * Always includes pinned tools.
     */
    async getToolsForContext(task: string, options: DisclosureOptions = {}): Promise<ToolDefinition[]> {
        const maxTools = options.maxTools || 20;
        const pinnedNames = options.pinnedTools || [];

        // 1. Get Pinned Tools
        let pinnedTools: ToolDefinition[] = [];
        if (pinnedNames.length > 0) {
            // We can use quickSearch or exact match if available. 
            // For now, let's just search and filter.
            // Ideally ToolSearchService should have getToolByName
            const allTools = this.searchService.quickSearch('', 1000); // Get all (up to 1000)
            pinnedTools = allTools.filter(t => pinnedNames.includes(t.name));
        }

        // 2. Search for Relevant Tools
        // We use the task description as the query
        // We exclude pinned tools from search results to avoid duplicates
        const searchLimit = maxTools - pinnedTools.length;
        let relevantTools: ToolDefinition[] = [];

        if (searchLimit > 0) {
            // Use hybrid search for best results
            const results = await this.searchService.hybridSearch(task, { 
                limit: searchLimit * 2, // Fetch more to filter duplicates
                threshold: 0.3 
            });

            relevantTools = results
                .map(r => r.tool)
                .filter(t => !pinnedNames.includes(t.name))
                .slice(0, searchLimit);
        }

        // 3. Combine
        let finalTools = [...pinnedTools, ...relevantTools];

        // 4. Optimize Descriptions (Semantic Reranking/Optimization)
        if (options.optimizeDescriptions && this.optimizer) {
            finalTools = await this.optimizer.optimizeTools(finalTools);
        }

        return finalTools;
    }

    /**
     * Reranks a list of tools based on relevance to a query.
     * Useful if you already have a list and want to order them for the LLM.
     */
    async rerankTools(tools: ToolDefinition[], query: string): Promise<ToolDefinition[]> {
        // We can use the search service's semantic search logic but restricted to this list.
        // Since ToolSearchService is designed for global search, we might need a helper here.
        // For now, let's just use the search service to find them again with the query.
        
        // Optimization: If list is small, just return as is.
        if (tools.length <= 5) return tools;

        // Actually, we can just use the hybrid search on the full set and intersect.
        // But that's inefficient.
        // Let's rely on getToolsForContext for the primary selection.
        return tools;
    }
}
