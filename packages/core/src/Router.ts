
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface RouterConfig {
    defaultProvider?: string;
}

export class Router {
    private clients: Map<string, Client> = new Map();

    constructor(private config: RouterConfig = {}) {
        console.log("Router initialized");
    }

    /**
     * Connects to a local MCP server via stdio.
     */
    async connectToServer(name: string, command: string, args: string[]) {
        if (this.clients.has(name)) return this.clients.get(name);

        const transport = new StdioClientTransport({
            command,
            args,
        });

        const client = new Client(
            {
                name: "aios-router",
                version: "0.1.0",
            },
            {
                capabilities: {},
            }
        );

        await client.connect(transport);
        this.clients.set(name, client);
        console.log(`Connected to MCP Server: ${name}`);
        return client;
    }

    async route(toolName: string): Promise<string> {
        if (toolName.startsWith("filesystem_")) {
            // Ensure connection exists (lazy load)
            if (!this.clients.has('filesystem')) {
                // Assuming installed globally or via npx, but here we expect local node_modules resolving
                // For now, we return the server NAME, and the MCPServer class will handle the actual call delegating to the client instance from this Router.
                // Wait, the Router should probably manage the clients.
            }
            return "filesystem";
        }
        if (toolName.startsWith("github_")) {
            return "github";
        }
        return "local";
    }

    getClient(name: string): Client | undefined {
        return this.clients.get(name);
    }
}
