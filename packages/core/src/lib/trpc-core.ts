import { initTRPC } from '@trpc/server';
import { z } from 'zod';

export const t = initTRPC.create();

// Mock RBAC Middleware
const isAdmin = t.middleware(async ({ next, ctx }) => {
    // In a real app, check ctx.user.role via JWT/Session
    // For local desktop app, we default to ADMIN unless config says 'demo_mode'
    // @ts-ignore
    const config = global.mcpServerInstance?.directorConfig;
    if (config?.demo_mode) {
        throw new Error("UNAUTHORIZED: Demo Mode enabled. Action restricted.");
    }
    return next();
});

export const publicProcedure = t.procedure;
export const adminProcedure = t.procedure.use(isAdmin);
