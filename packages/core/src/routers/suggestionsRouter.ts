import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';

export const suggestionsRouter = t.router({
    list: publicProcedure.query(() => {
        // @ts-ignore
        if (global.mcpServerInstance && global.mcpServerInstance.suggestionService) {
            // @ts-ignore
            return global.mcpServerInstance.suggestionService.getPendingSuggestions();
        }
        return [];
    }),
    resolve: publicProcedure.input(z.object({
        id: z.string(),
        status: z.enum(['APPROVED', 'REJECTED'])
    })).mutation(async ({ input }) => {
        // @ts-ignore
        if (global.mcpServerInstance && global.mcpServerInstance.suggestionService) {
            // @ts-ignore
            const suggestion = global.mcpServerInstance.suggestionService.resolveSuggestion(input.id, input.status);

            // EXECUTION LOGIC FOR APPROVED ACTIONS
            if (suggestion && input.status === 'APPROVED' && suggestion.payload && suggestion.payload.tool) {
                console.log(`[Borg Core] Auto-Executing Approved Suggestion: ${suggestion.title}`);
                // @ts-ignore
                await global.mcpServerInstance.executeTool(suggestion.payload.tool, suggestion.payload.args || {});
            }
            return suggestion;
        }
        return null;
    }),
    clearAll: publicProcedure.mutation(() => {
        // @ts-ignore
        if (global.mcpServerInstance && global.mcpServerInstance.suggestionService) {
            // @ts-ignore
            global.mcpServerInstance.suggestionService.clearAll();
        }
        return true;
    })
});
