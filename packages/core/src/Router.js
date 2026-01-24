import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
export class Router {
    config;
    clients = new Map();
    constructor(config = {}) {
        this.config = config;
        console.log("Router initialized");
    }
    /**
     * Connects to a local MCP server via stdio.
     */
    async connectToServer(name, command, args) {
        if (this.clients.has(name))
            return this.clients.get(name);
        const transport = new StdioClientTransport({
            command,
            args,
        });
        const client = new Client({
            name: "aios-router",
            version: "0.1.0",
        }, {
            capabilities: {},
        });
        await client.connect(transport);
        this.clients.set(name, client);
        console.log(`Connected to MCP Server: ${name}`);
        return client;
    }
    async listTools() {
        const allTools = [];
        for (const [name, client] of this.clients.entries()) {
            try {
                const result = await client.listTools();
                // Simple namespacing: if tool is "read_file", keep it as is for now
                // In future: prefix with `${name}__` if needed
                allTools.push(...result.tools);
            }
            catch (e) {
                console.error(`Failed to list tools from ${name}`, e);
            }
        }
        return allTools;
    }
    async callTool(name, args) {
        // Naive routing: broadcast to all clients or find owner (inefficent but simple for v1)
        // Better: Maintain a tool->client map in listTools()
        // Strategy: Try to find which client has this tool
        // Optimization: Cache this mapping later
        for (const [clientName, client] of this.clients.entries()) {
            try {
                const tools = await client.listTools();
                if (tools.tools.find(t => t.name === name)) {
                    return (await client.callTool({ name, arguments: args }));
                }
            }
            catch (e) {
                // Continue searching
            }
        }
        throw new Error(`Tool ${name} not found in any connected MCP server.`);
    }
    getClient(name) {
        return this.clients.get(name);
    }
}
