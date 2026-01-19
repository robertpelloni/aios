
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc.js';
export type { AppRouter } from './trpc.js';
import { MCPServer } from './MCPServer.js';

export const name = "@aios/core";
console.log(`Hello from ${name}`);

const app = express();
app.use(cors());

// tRPC Middleware
app.use(
    '/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext: () => ({}),
    })
);

// MCP Server Setup
const mcp = new MCPServer();
mcp.start().catch((err) => console.error("Failed to start MCP server:", err));

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`AIOS Core running on http://localhost:${PORT}`);
    console.log(`tRPC endpoint active at http://localhost:${PORT}/trpc`);
});
