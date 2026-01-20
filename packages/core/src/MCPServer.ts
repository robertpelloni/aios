
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from 'url';
import path from 'path';
import { Router } from "./Router.js";
import { Indexer } from './indexing/Indexer.js';
import { ModelSelector } from './ModelSelector.js';
import { CodeChunk } from "./indexing/VectorStore.js";
import { WebSocketServer } from 'ws';
import { WebSocketServerTransport } from './transports/WebSocketServerTransport.js';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MCPServer {
    private server: Server; // Stdio Server
    private wsServer: Server; // WebSocket Server
    private router: Router;
    private indexer: Indexer;
    private modelSelector: ModelSelector;

    constructor() {
        this.router = new Router();
        this.modelSelector = new ModelSelector();
        this.indexer = new Indexer(process.cwd());

        // Standard Server (Stdio)
        this.server = this.createServerInstance();

        // WebSocket Server (Extension Bridge)
        this.wsServer = this.createServerInstance();
    }

    private createServerInstance(): Server {
        const s = new Server(
            { name: "borg-core", version: "0.1.0" },
            { capabilities: { tools: {} } }
        );
        this.setupHandlers(s);
        return s;
    }

    private setupHandlers(serverInstance: Server) {
        serverInstance.setRequestHandler(ListToolsRequestSchema, async () => {
            const internalTools = [
                {
                    name: "router_status",
                    description: "Check the status of the Borg Router",
                    inputSchema: { type: "object", properties: {} },
                },
                {
                    name: "search_codebase",
                    description: "Semantic search over the codebase",
                    inputSchema: {
                        type: "object",
                        properties: { query: { type: "string" } },
                        required: ["query"]
                    },
                }
            ];

            // Aggregation: Fetch tools from all connected sub-MCPs
            const externalTools = await this.router.listTools();

            return {
                tools: [...internalTools, ...externalTools],
            };
        });

        serverInstance.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name === "router_status") {
                return {
                    content: [{ type: "text", text: "Borg Router is active." }],
                };
            }
            if (request.params.name === "search_codebase") {
                const query = request.params.arguments?.query as string;
                const results = await this.indexer.search(query);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(results.map((r: CodeChunk) => ({
                            path: r.file_path,
                            preview: r.content.substring(0, 200) + "..."
                        })), null, 2),
                    }],
                };
            }

            // Delegation: Forward to sub-MCPs via Router
            try {
                return await this.router.callTool(request.params.name, request.params.arguments);
            } catch (e: any) {
                throw new Error(`Tool execution failed: ${e.message}`);
            }
        });
    }

    async start() {
        // 1. Start Stdio (for local CLI usage)
        const stdioTransport = new StdioServerTransport();
        await this.server.connect(stdioTransport);
        console.error("Borg Core: Stdio Transport Active");

        // 2. Start WebSocket (for Extension/Web usage)
        const PORT = 3000;
        const httpServer = http.createServer();
        const wss = new WebSocketServer({ server: httpServer });
        const wsTransport = new WebSocketServerTransport(wss);

        httpServer.listen(PORT, () => {
            console.error(`Borg Core: WebSocket Transport Active on ws://localhost:${PORT}`);
        });

        await this.wsServer.connect(wsTransport);

        // 3. Connect Filesystem MCP (Sub-MCP example)
        try {
            await this.router.connectToServer('filesystem', 'npx', ['-y', '@modelcontextprotocol/server-filesystem', '.']);
            console.error("Filesystem MCP connected");
        } catch (e) {
            console.error("Failed to connect to Filesystem MCP", e);
        }
    }
}
