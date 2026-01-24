
import { MCPServer } from './MCPServer.js';

async function main() {
    // Redirect console.log to stderr to keep stdout clean for MCP JSON-RPC
    const originalLog = console.log;
    console.log = console.error;

    try {
        const mcp = new MCPServer({ skipWebsocket: true });
        await mcp.start();
        console.error("[Borg Core] MCP Server Stdio Entry Point Started.");
    } catch (err) {
        console.error("Failed to start MCP server:", err);
        process.exit(1);
    }
}

main();
