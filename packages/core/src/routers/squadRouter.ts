import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';

export const squadRouter = t.router({
    list: publicProcedure.query(() => {
        // @ts-ignore
        if (global.mcpServerInstance && global.mcpServerInstance.squadService) {
            // @ts-ignore
            return global.mcpServerInstance.squadService.listMembers();
        }
        return [];
    }),
    spawn: publicProcedure.input(z.object({
        branch: z.string(),
        goal: z.string()
    })).mutation(async ({ input }) => {
        // @ts-ignore
        if (global.mcpServerInstance && global.mcpServerInstance.squadService) {
            // @ts-ignore
            return await global.mcpServerInstance.squadService.spawnMember(input.branch, input.goal);
        }
        throw new Error("SquadService not found");
    }),
    kill: publicProcedure.input(z.object({
        branch: z.string()
    })).mutation(async ({ input }) => {
        // @ts-ignore
        if (global.mcpServerInstance && global.mcpServerInstance.squadService) {
            // @ts-ignore
            return await global.mcpServerInstance.squadService.killMember(input.branch);
        }
        throw new Error("SquadService not found");
    })
});
