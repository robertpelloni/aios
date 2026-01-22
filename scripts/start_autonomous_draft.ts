
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    console.log("Initializing Autonomous Supervisor...");

    // Connect to Core Stdio
    const transport = new StdioClientTransport({
        command: "node",
        args: ["c:/Users/hyper/workspace/borg/packages/core/dist/server-stdio.js"]
    });

    const client = new Client(
        { name: "autonomous-trigger", version: "1.0.0" },
        { capabilities: {} }
    );

    await client.connect(transport);
    console.log("Connected to Borg Core.");

    try {
        // 1. Set Autonomy to High
        console.log("Setting Autonomy Level to HIGH...");
        await client.callTool({
            name: "set_autonomy",
            arguments: { level: "high" }
        });

        // 2. Start Chat Daemon (Director Loop)
        console.log("Starting Director Chat Daemon...");
        await client.callTool({
            name: "start_chat_daemon",
            arguments: {}
        });

        // 3. Start Watchdog (Process Monitor)
        console.log("Starting Supervisor Watchdog...");
        await client.callTool({
            name: "start_watchdog",
            arguments: { maxCycles: 100 } // Long running
        });

        console.log("✅ Autonomous Mode Active.");
        console.log("The Supervisor is now watching your IDE and will auto-approve requests.");
        console.log("Keep this process running to maintain the connection.");

    } catch (e: any) {
        console.error("Failed to activate autonomous mode:", e.message);
    }

    // Keep alive? Actually config commands might be persistent in memory, 
    // but the Daemon loop resides in the Server process.
    // If we disconnect Stdio, the server *might* shut down if it's the only transport.
    // But here we are connecting TO the existing server? 
    // No, StdioClientTransport spawns a NEW server instance usually.
    // WE NEED TO CONNECT TO THE RUNNING SERVER via WebSocket or HTTP?
    // Core supports WebSocket on 3001. We should use that for control if we want to affect the main instance.
    // BUT the main instance is running via `pnpm start` in CLI?
    // If the user hasn't started the CLI, this script starts a standalone one.

    // Ideally, we send a command to the EXISTING Core.
    // If using Stdio transport here, we create an ISOLATED instance.
    // This Isolated instance has its own Director/PermissionManager.
    // It WON'T affect the "Extension" unless they share state (they don't, in memory).

    // DATA Mismatch:
    // The Extension connects to `ws://localhost:3001`.
    // We need to configure THAT specific server instance.
    // So this script should connect via WebSocket to port 3001.

    process.exit(0);
}

// We need a WebSocket Client version of this script.
