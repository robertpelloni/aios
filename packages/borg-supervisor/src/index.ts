import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Installer } from './installer.js';
// import psList from 'ps-list'; 
// Note: ps-list might need dynamic import in ESM or proper build handling. 
// For now we'll stub it or use child_process if ps-list causes issues.

class SupervisorServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            {
                name: "borg-supervisor",
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
                        name: "install_supervisor",
                        description: "Install Borg Supervisor into Antigravity MCP Config",
                        inputSchema: {
                            type: "object",
                            properties: {
                                configPath: {
                                    type: "string",
                                    description: "Abs path to mcp.json"
                                }
                            }
                        }
                    },
                    {
                        name: "list_processes",
                        description: "List active processes (Stubbed for now)",
                        inputSchema: { type: "object", properties: {} }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name === "install_supervisor") {
                const configPath = request.params.arguments?.configPath as string | undefined;
                const installer = new Installer(configPath);
                const result = await installer.install();
                return {
                    content: [{ type: "text", text: result }]
                };
            }

            if (request.params.name === "list_processes") {
                // TODO: Implement real process listing
                return {
                    content: [{ type: "text", text: "Process listing not yet implemented." }]
                };
            }

            throw new Error("Tool not found");
        });
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Borg Supervisor running on Stdio");
    }
}

const server = new SupervisorServer();
server.start().catch(console.error);
