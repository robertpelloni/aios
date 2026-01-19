
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Router } from "./Router.js";

export class MCPServer {
    private server: Server;
    private router: Router;

    constructor() {
        this.router = new Router();
        this.server = new Server(
            {
                name: "aios-core",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );
        this.setupHandlers();
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "router_status",
                        description: "Check the status of the AIOS Router",
                        inputSchema: {
                            type: "object",
                            properties: {},
                        },
                    },
                    {
                        name: "search_codebase",
                        description: "Semantic search over the codebase",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: { type: "string" }
                            },
                            required: ["query"]
                        },
                    }
                ],
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name === "router_status") {
                return {
                    content: [
                        {
                            type: "text",
                            text: "AIOS Router is active. Universal MCP Host online.",
                        },
                    ],
                };
            }
            if (request.params.name === "search_codebase") {
                // Mock response until Indexer is fully wired with real embeddings
                return {
                    content: [
                        {
                            type: "text",
                            text: `Searching codebase for: ${request.params.arguments?.query}. (Indexer not yet fully embedded)`,
                        },
                    ],
                };
            }
            throw new Error(`Tool not found: ${request.params.name}`);
        });
    }

    async start() {
        // Initialize Sub-MCPs
        // Note: Using npx for now to ensure we get the executable, or node_modules path
        try {
            await this.router.connectToServer('filesystem', 'npx', ['-y', '@modelcontextprotocol/server-filesystem', '.']);
            console.log("Filesystem MCP connected");
        } catch (e) {
            console.error("Failed to connect to Filesystem MCP", e);
        }

        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("AIOS Core MCP Server running on stdio");
    }
}
