
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from 'url';
import path from 'path';
import { Router } from "./Router.js";
import { ModelSelector } from './ModelSelector.js';
import { WebSocketServer } from 'ws';
import { WebSocketServerTransport } from './transports/WebSocketServerTransport.js';
import http from 'http';
import { SkillRegistry } from "./skills/SkillRegistry.js";
import { FileSystemTools } from "./tools/FileSystemTools.js";
import { TerminalTools } from "./tools/TerminalTools.js";
import { MemoryTools } from "./tools/MemoryTools.js";
import { TunnelTools } from "./tools/TunnelTools.js";
import { ConfigTools } from "./tools/ConfigTools.js";
import { LogTools } from "./tools/LogTools.js";
import { SearchTools } from "./tools/SearchTools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MCPServer {
    private server: Server; // Stdio Server
    private wsServer: Server; // WebSocket Server
    private router: Router;
    private modelSelector: ModelSelector;
    private skillRegistry: SkillRegistry;

    constructor() {
        this.router = new Router();
        this.modelSelector = new ModelSelector();
        this.skillRegistry = new SkillRegistry([
            path.join(process.cwd(), '.borg', 'skills'),
            path.join(process.env.HOME || process.env.USERPROFILE || '', '.borg', 'skills')
        ]);

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
                }
            ];

            // Standard Library Tools
            const standardTools = [...FileSystemTools, ...TerminalTools, ...MemoryTools, ...TunnelTools, ...LogTools, ...ConfigTools, ...SearchTools].map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema
            }));

            // Skills
            const skillTools = this.skillRegistry.getSkillTools();

            // Aggregation: Fetch tools from all connected sub-MCPs
            const externalTools = await this.router.listTools();

            return {
                tools: [
                    ...internalTools,
                    ...standardTools,
                    ...skillTools,
                    ...externalTools
                ],
            };
        });

        serverInstance.setRequestHandler(CallToolRequestSchema, async (request) => {
            // 1. Check Internal Status Tools
            if (request.params.name === "router_status") {
                return {
                    content: [{ type: "text", text: "Borg Router is active." }],
                };
            }

            // 2. Check Standard Library
            const standardTool = [...FileSystemTools, ...TerminalTools, ...MemoryTools, ...TunnelTools, ...LogTools, ...ConfigTools, ...SearchTools].find(t => t.name === request.params.name);
            if (standardTool) {
                // @ts-ignore
                return standardTool.handler(request.params.arguments);
            }

            // 3. Check Skills
            if (request.params.name === "list_skills") {
                return this.skillRegistry.listSkills();
            }
            if (request.params.name === "read_skill") {
                return this.skillRegistry.readSkill(request.params.arguments?.skillName as string);
            }

            // 4. Delegation: Forward to sub-MCPs via Router
            try {
                return await this.router.callTool(request.params.name, request.params.arguments);
            } catch (e: any) {
                throw new Error(`Tool execution failed: ${e.message}`);
            }
        });
    }

    async start() {
        // Initialize systems
        await this.skillRegistry.loadSkills();

        // 1. Start Stdio (for local CLI usage)
        const stdioTransport = new StdioServerTransport();
        await this.server.connect(stdioTransport);
        console.error("Borg Core: Stdio Transport Active");

        // 2. Start WebSocket (for Extension/Web usage)
        const PORT = 3001;
        const httpServer = http.createServer();
        const wss = new WebSocketServer({ server: httpServer });
        const wsTransport = new WebSocketServerTransport(wss);

        httpServer.listen(PORT, () => {
            console.error(`Borg Core: WebSocket Transport Active on ws://localhost:${PORT}`);
        });

        await this.wsServer.connect(wsTransport);
    }
}
