import { McpManager } from './McpManager.js';
import { LogManager } from './LogManager.js';
import { MetaMcpClient } from '../clients/MetaMcpClient.js';
import { ToolSearchService } from '../services/ToolSearchService.js';
import { VectorStore } from '../services/VectorStore.js';
import { EventEmitter } from 'events';
import { ModelGateway } from '../gateway/ModelGateway.js';

export class McpProxyManager extends EventEmitter {
    private metaClient: MetaMcpClient;
    private searchService: ToolSearchService;
    private internalTools: Map<string, { def: any, handler: (args: any) => Promise<any> }> = new Map();
    private modelGateway?: ModelGateway;

    // Session Management for Progressive Disclosure
    private sessionVisibleTools: Map<string, Set<string>> = new Map();
    private progressiveMode = process.env.MCP_PROGRESSIVE_MODE === 'true';

    constructor(
        private mcpManager: McpManager,
        private logManager: LogManager,
        private vectorStore?: VectorStore,
        modelGateway?: ModelGateway
    ) {
        super();
        this.metaClient = new MetaMcpClient();
        this.searchService = new ToolSearchService();
        this.modelGateway = modelGateway;
    }

    registerInternalTool(def: any, handler: (args: any) => Promise<any>) {
        this.internalTools.set(def.name, { def, handler });
        if (this.vectorStore) {
            this.vectorStore.add(def.name, `${def.name}: ${def.description}`, { type: 'tool', name: def.name });
        }
    }

    async start() {
        await this.metaClient.connect();
        await this.refreshSearchIndex();
    }

    private async refreshSearchIndex() {
        try {
            const tools = await this.fetchAllToolsInternal();
            this.searchService.setTools(tools);

            if (this.vectorStore) {
                for (const tool of tools) {
                    await this.vectorStore.add(tool.name, `${tool.name}: ${tool.description}`, { type: 'tool', name: tool.name });
                }
            }
        } catch (e) {
            console.warn('[Proxy] Failed to refresh search index:', e);
        }
    }

    private async fetchAllToolsInternal() {
        const tools = [];
        const servers = this.mcpManager.getAllServers();

        // 1. Internal Tools
        for (const tool of this.internalTools.values()) {
            tools.push(tool.def);
        }

        // 2. Local Servers
        for (const s of servers) {
            if (s.status === 'running') {
                const client = this.mcpManager.getClient(s.name);
                if (client) {
                    try {
                        const result = await client.listTools();
                        tools.push(...result.tools);
                    } catch (e) {
                        console.error(`Failed to list tools from ${s.name}`, e);
                    }
                }
            }
        }

        // 3. MetaMCP Tools (Remote/Docker)
        const metaTools = await this.metaClient.listTools();
        tools.push(...metaTools);

        return tools;
    }

    async getAllTools(sessionId?: string) {
        const metaTools = [
            {
                name: "search_tools",
                description: "Search for available tools by keyword (Fuzzy Search) or concept (Semantic Search).",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "load_tool",
                description: "Load a specific tool into your context for use.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string" }
                    },
                    required: ["name"]
                }
            }
        ];

        if (!this.progressiveMode) {
            const all = await this.fetchAllToolsInternal();
            return [...metaTools, ...all.filter(t => t.name !== 'search_tools' && t.name !== 'load_tool')];
        }

        const visible = new Set<string>();
        if (sessionId && this.sessionVisibleTools.has(sessionId)) {
            const sessionSet = this.sessionVisibleTools.get(sessionId)!;
            sessionSet.forEach(t => visible.add(t));
        }

        const internalDefs = Array.from(this.internalTools.values()).map(v => v.def);
        const allTools = await this.fetchAllToolsInternal();
        const loadedTools = allTools.filter(t => visible.has(t.name));

        return [...metaTools, ...internalDefs, ...loadedTools];
    }

    private async retryWithSelfHealing(name: string, args: any, error: string): Promise<any | null> {
        if (!this.modelGateway) return null;

        console.log(`[Self-Healing] Analyzing error for ${name}...`);

        try {
            const toolDef = (await this.fetchAllToolsInternal()).find(t => t.name === name);
            const prompt = `
            The tool '${name}' failed with error: "${error}".
            Arguments used: ${JSON.stringify(args)}
            Tool Schema: ${JSON.stringify(toolDef?.inputSchema || {})}

            Fix the arguments to match the schema and correct the error.
            Return ONLY a valid JSON object of the new arguments.
            `;

            const response = await this.modelGateway.complete({
                messages: [{ role: 'user', content: prompt }]
            });

            // Extract JSON
            const jsonStr = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const newArgs = JSON.parse(jsonStr);

            console.log(`[Self-Healing] Retrying with:`, newArgs);
            return await this.callToolInternal(name, newArgs, undefined, false); // Pass false to prevent infinite recursion

        } catch (e) {
            console.warn(`[Self-Healing] Failed:`, e);
            return null;
        }
    }

    async callTool(name: string, args: any, sessionId?: string) {
        return this.callToolInternal(name, args, sessionId, true);
    }

    private async callToolInternal(name: string, args: any, sessionId?: string, retry: boolean = true) {
        // Emit Pre-Tool Event
        this.emit('pre_tool_call', { name, args, sessionId });

        if (['dangerous_tool'].includes(name)) {
            throw new Error("Tool blocked by policy.");
        }

        if (name === 'search_tools') {
            await this.refreshSearchIndex();

            let results: any[] = [];

            // Try Semantic Search first
            if (this.vectorStore) {
                const semanticResults = await this.vectorStore.search(args.query);
                if (semanticResults.length > 0) {
                    results = semanticResults.map(r => ({ name: r.name, score: r.score, source: 'semantic' }));
                }
            }

            // Fallback/Mix with Fuzzy Search
            if (results.length === 0) {
                const fuzzyResults = this.searchService.search(args.query);
                results = fuzzyResults.map(r => ({ ...r, source: 'fuzzy' }));
            }

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(results, null, 2)
                }]
            };
        }

        if (name === 'load_tool') {
            if (!sessionId) {
                return { content: [{ type: "text", text: "Error: No session ID provided." }], isError: true };
            }
            if (!this.sessionVisibleTools.has(sessionId)) {
                this.sessionVisibleTools.set(sessionId, new Set());
            }
            this.sessionVisibleTools.get(sessionId)!.add(args.name);
            return {
                content: [{ type: "text", text: `Tool '${args.name}' loaded successfully.` }]
            };
        }

        let response;
        let serverName = 'unknown';

        try {
            // 1. Internal
            if (this.internalTools.has(name)) {
                serverName = 'internal';
                this.logManager.log({ type: 'request', tool: name, server: 'internal', args });
                const result = await this.internalTools.get(name)!.handler(args);
                response = { content: [{ type: "text", text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
                this.logManager.log({ type: 'response', tool: name, server: 'internal', result: response });
            }
            // 2. Local Servers
            else {
                const servers = this.mcpManager.getAllServers();
                let found = false;
                for (const s of servers) {
                    if (s.status === 'running') {
                        const client = this.mcpManager.getClient(s.name);
                        if (client) {
                            try {
                                const list = await client.listTools();
                                if (list.tools.find((t: any) => t.name === name)) {
                                    serverName = s.name;
                                    this.logManager.log({ type: 'request', tool: name, server: s.name, args });
                                    response = await client.callTool({ name, arguments: args });
                                    this.logManager.log({ type: 'response', tool: name, server: s.name, result: response });
                                    found = true;
                                    break;
                                }
                            } catch (e) { /* ignore */ }
                        }
                    }
                }

                // 3. MetaMCP
                if (!found) {
                    serverName = 'metamcp';
                    this.logManager.log({ type: 'request', tool: name, server: 'metamcp', args });
                    response = await this.metaClient.callTool(name, args);
                    this.logManager.log({ type: 'response', tool: name, server: 'metamcp', result: response });
                }
            }
        } catch (e: any) {
            this.logManager.log({ type: 'error', tool: name, server: serverName, error: e.message });

            // Self-Healing Logic
            if (retry && this.modelGateway) {
                const healedResponse = await this.retryWithSelfHealing(name, args, e.message);
                if (healedResponse) {
                    return healedResponse;
                }
            }

            response = { isError: true, content: [{ type: "text", text: e.message }] };
        }

        if (!response) {
             throw new Error(`Tool ${name} not found.`);
        }

        // Emit Post-Tool Event
        this.emit('post_tool_call', { name, args, result: response, sessionId });

        return response;
    }
}
