
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc.js';
import { MCPServer } from './MCPServer.js';

export { MCPServer } from './MCPServer.js';
export type { AppRouter } from './trpc.js';

export const name = "@borg/core";

export async function startOrchestrator() {
    console.log(`Initializing ${name}...`);

    // 1. Start tRPC Server (Dashboard API)
    const app = express();
    app.use(cors());
    app.use(
        '/trpc',
        createExpressMiddleware({
            router: appRouter,
            createContext: () => ({}),
        })
    );

    const TRPC_PORT = 4000;
    app.listen(TRPC_PORT, () => {
        console.log(`tRPC Server running at http://localhost:${TRPC_PORT}/trpc`);
    });

    // 2. Start MCP Server (Bridged: Stdio + WebSocket)
    try {
        const mcp = new MCPServer();
        await mcp.start();
    } catch (err) {
        console.error("Failed to start MCP server:", err);
        throw err;
    }
}
