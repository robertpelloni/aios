import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';

export const councilRouter = t.router({
    runSession: publicProcedure.input(z.object({ proposal: z.string() })).mutation(async ({ input }) => {
        // @ts-ignore
        if (global.mcpServerInstance) {
            // @ts-ignore
            const result = await global.mcpServerInstance.council.runConsensusSession(input.proposal);
            return result;
        }
        throw new Error("MCPServer instance not found");
    }),
    getLatestSession: publicProcedure.query(async () => {
        // @ts-ignore
        if (global.mcpServerInstance) {
            // @ts-ignore
            return global.mcpServerInstance.council.lastResult || null;
        }
        return null;
    })
});
