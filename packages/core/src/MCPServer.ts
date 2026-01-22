
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
import { Director } from "./agents/Director.js";
import { PermissionManager, AutonomyLevel } from "./security/PermissionManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MCPServer {
    private server: Server; // Stdio Server
    private wsServer: Server; // WebSocket Server
    private router: Router;
    private modelSelector: ModelSelector;
    private skillRegistry: SkillRegistry;
    private director: Director;
    private director: Director;
    private permissionManager: PermissionManager;
    public wssInstance: any; // WebSocket.Server

    constructor() {
        this.router = new Router();
        this.modelSelector = new ModelSelector();
        this.skillRegistry = new SkillRegistry([
            path.join(process.cwd(), '.borg', 'skills'),
            path.join(process.env.HOME || process.env.USERPROFILE || '', '.borg', 'skills')
        ]);
        this.director = new Director(this.router, this.modelSelector);
        this.director = new Director(this.router, this.modelSelector);
        this.permissionManager = new PermissionManager('low'); // Default safety

        // @ts-ignore
        global.mcpServerInstance = this;

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
                    name: "start_task",
                    description: "Start an autonomous task with the Director Agent",
                    inputSchema: {
                        type: "object",
                        properties: {
                            goal: { type: "string" },
                            maxSteps: { type: "number" }
                        },
                        required: ["goal"]
                    }
                },
                {
                    name: "set_autonomy",
                    description: "Set the autonomy level (low, medium, high)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            level: { type: "string", enum: ["low", "medium", "high"] }
                        },
                        required: ["level"]
                    }
                },
                {
                    name: "chat_reply",
                    description: "Insert text into the active browser chat (Web Bridge)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            text: { type: "string" }
                        },
                        required: ["text"]
                    }
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
            // 0. Permission Check
            const isApproved = this.permissionManager.checkPermission(request.params.name, request.params.arguments);
            if (!isApproved) {
                // In a real TUI/GUI, this would effectively be "Pending Approval".
                // For now, we hard fail so the user knows they must authorize.
                throw new Error(`Permission Denied for tool '${request.params.name}'. Autonomy Level is too low. Use set_autonomy('high') to bypass.`);
            }

            // 1. Internal Status / Config Tools
            if (request.params.name === "router_status") {
                return {
                    content: [{ type: "text", text: "Borg Router is active." }],
                };
            }

            if (request.params.name === "set_autonomy") {
                const level = request.params.arguments?.level as AutonomyLevel;
                this.permissionManager.setAutonomyLevel(level);
                return {
                    content: [{ type: "text", text: `Autonomy Level set to: ${level}` }]
                };
            }

            if (request.params.name === "chat_reply") {
                const text = request.params.arguments?.text as string;
                // Broadcast to all connected WebSocket clients (Extensions)
                // We need access to wsServer clients.
                // Quick hack: Use a broadcast method if available or iterate.
                // WebSocketServer in `ws` library has `clients`.
                // Accessing private wsServer... we need to change it to public or add a method.
                // Assuming `this.wsServer` is the `ws.WebSocketServer` instance inside `WebSocketServerTransport`? 
                // Wait, `this.wsServer` is `Server` (MCP SDK), NOT `ws.Server`.
                // Look at lines 31: `private wsServer: Server; // WebSocket Server`.
                // Actually, line 159 `const wss = new WebSocketServer` is local to start().
                // We need to store `wss` on the class.

                // CRITICAL FIX: We need to emit an event or access the WSS.
                // Simple approach for now: We can't easily reach into the closure.
                // We will skip actual implementation for this step and just log it, 
                // OR refactor start() to save wss. 
                // Let's refactor start() in next step. For now, return success.
                console.log(`[Borg Core] Chat Reply Requested: ${text}`);

                if (this.wssInstance) {
                    this.wssInstance.clients.forEach((client: any) => {
                        if (client.readyState === 1) { // OPEN
                            client.send(JSON.stringify({
                                type: 'INSERT_TEXT',
                                text: text
                            }));
                        }
                    });
                    return {
                        content: [{ type: "text", text: `Sent to browser: "${text}"` }]
                    };
                }

                return {
                    content: [{ type: "text", text: "Error: No WebSocket server active to forward reply." }]
                };
            }

            if (request.params.name === "start_task") {
                const goal = request.params.arguments?.goal as string;
                const maxSteps = request.params.arguments?.maxSteps as number || 10;
                const result = await this.director.executeTask(goal, maxSteps);
                return {
                    content: [{ type: "text", text: result }]
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
        this.wssInstance = wss;
        const wsTransport = new WebSocketServerTransport(wss);

        httpServer.listen(PORT, () => {
            console.error(`Borg Core: WebSocket Transport Active on ws://localhost:${PORT}`);
        });

        await this.wsServer.connect(wsTransport);
    }
}
