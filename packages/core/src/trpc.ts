
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

export const t = initTRPC.create();

export const appRouter = t.router({
    health: t.procedure.query(() => {
        return { status: 'running', service: '@borg/core' };
    }),
    getTaskStatus: t.procedure
        .input(z.object({ taskId: z.string().optional() }))
        .query(({ input }) => {
            return {
                taskId: input.taskId || 'current',
                status: 'processing',
                progress: 45
            };
        }),
    indexingStatus: t.procedure.query(() => {
        return { status: 'idle', filesIndexed: 0, totalFiles: 0 };
    }),
    remoteAccess: t.router({
        start: t.procedure.mutation(async () => {
            const { TunnelTools } = await import('./tools/TunnelTools.js');
            const result = await TunnelTools[0].handler({ port: 3000 });
            return result.content[0].text;
        }),
        stop: t.procedure.mutation(async () => {
            const { TunnelTools } = await import('./tools/TunnelTools.js');
            const result = await TunnelTools[1].handler({});
            return result.content[0].text;
        }),
        status: t.procedure.query(async () => {
            const { TunnelTools } = await import('./tools/TunnelTools.js');
            const result = await TunnelTools[2].handler({});
            return JSON.parse(result.content[0].text);
        })
    }),
    config: t.router({
        readAntigravity: t.procedure.query(async () => {
            const { ConfigTools } = await import('./tools/ConfigTools.js');
            // @ts-ignore
            const result = await ConfigTools[0].handler({});
            // Parse JSON content from the tool output
            return JSON.parse(result.content[0].text);
        }),
        writeAntigravity: t.procedure.input(z.object({ content: z.string() })).mutation(async ({ input }) => {
            const { ConfigTools } = await import('./tools/ConfigTools.js');
            const result = await ConfigTools[1].handler({ content: input.content });
            return result.content[0].text;
        })
    }),
    logs: t.router({
        read: t.procedure.input(z.object({ lines: z.number().optional() })).query(async ({ input }) => {
            const { LogTools } = await import('./tools/LogTools.js');
            // @ts-ignore
            const result = await LogTools[0].handler({ lines: input.lines });
            return result.content[0].text;
        })
    }),
    autonomy: t.router({
        setLevel: t.procedure.input(z.object({ level: z.enum(['low', 'medium', 'high']) })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                global.mcpServerInstance.permissionManager.setAutonomyLevel(input.level);
                return input.level;
            }
            throw new Error("MCPServer instance not found global");
        }),
        getLevel: t.procedure.query(() => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return global.mcpServerInstance.permissionManager.autonomyLevel;
            }
            return 'low';
        }),
        activateFullAutonomy: t.procedure.mutation(async () => {
            // @ts-ignore
            const mcp = global.mcpServerInstance;
            if (mcp) {
                // 1. Set Autonomy High
                mcp.permissionManager.setAutonomyLevel('high');

                // 2. Start Director Chat Daemon
                mcp.director.startChatDaemon();

                // 3. Start Watchdog (Long)
                mcp.director.startWatchdog(100);

                return "Autonomous Supervisor Activated (High Level + Chat Daemon + Watchdog)";
            }
            throw new Error("MCPServer instance not found");
        })
    }),
    director: t.router({
        chat: t.procedure.input(z.object({ message: z.string() })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                // Director.executeTask is basically "Run this goal".
                // In a chat UI, user says "Do X". Director does X and returns summary.
                const result = await global.mcpServerInstance.director.executeTask(input.message);
                return result;
            }
            throw new Error("MCPServer instance not found");
        })
    }),
    council: t.router({
        startDebate: t.procedure.input(z.object({ proposal: z.string() })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                const result = await global.mcpServerInstance.council.startDebate(input.proposal);
                return result;
            }
            throw new Error("MCPServer instance not found");
        })
    }),
    runCommand: t.procedure.input(z.object({ command: z.string() })).mutation(async ({ input }) => {
        const { TerminalTools } = await import('./tools/TerminalTools.js');
        // @ts-ignore
        const result = await TerminalTools[0].handler({ command: input.command, cwd: process.cwd() });
        return result.content[0].text;
    }),
    skills: t.router({
        list: t.procedure.query(async () => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                const mcp = global.mcpServerInstance;
                // @ts-ignore
                const skills = await mcp.skillRegistry.listSkills();
                return skills;
            }
            return { tools: [] };
        }),
        read: t.procedure.input(z.object({ name: z.string() })).query(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return await global.mcpServerInstance.skillRegistry.readSkill(input.name);
            }
            return { content: [{ type: "text", text: "Error: No Server" }] };
        })
    }),
    executeTool: t.procedure.input(z.object({
        name: z.string(),
        args: z.any()
    })).mutation(async ({ input }) => {
        // @ts-ignore
        if (global.mcpServerInstance) {
            // @ts-ignore
            const result = await global.mcpServerInstance.executeTool(input.name, input.args);
            // Result is { content: ... }
            // @ts-ignore
            if (result.isError) throw new Error(result.content[0].text);
            // @ts-ignore
            return result.content[0].text;
        }
        throw new Error("MCPServer not found");
    })
});

export type AppRouter = typeof appRouter;
