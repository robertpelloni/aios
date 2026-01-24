import fs from "fs/promises";
import path from "path";
import os from "os";
// Hardcoded path to match ConfigTools (Should be centralized in a config module)
const ANTIGRAVITY_CONFIG_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'Antigravity', 'User', 'mcp.json');
import { MarketplaceService } from "./MarketplaceService.js";
export class McpmRegistry {
    marketplace = new MarketplaceService();
    registry = [
        {
            name: "sqlite",
            description: "SQLite Database MCP Server",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-sqlite", "--file", "database.db"]
        },
        {
            name: "filesystem",
            description: "Filesystem Access MCP Server",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem", "./"]
        },
        {
            name: "postgres",
            description: "PostgreSQL Database MCP Server",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:password@localhost/db"]
        },
        {
            name: "github",
            description: "GitHub API MCP Server",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-github"],
            env: { GITHUB_TOKEN: "YOUR_TOKEN_HERE" }
        },
        {
            name: "slack",
            description: "Slack API MCP Server",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-slack"],
            env: { SLACK_BOT_TOKEN: "YOUR_TOKEN_HERE" }
        },
        {
            name: "memory",
            description: "Knowledge Graph Memory MCP Server",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-memory"]
        },
        {
            name: "puppeteer",
            description: "Puppeteer Browser Automation MCP Server",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-puppeteer"]
        }
    ];
    getTools() {
        return [
            {
                name: "mcpm_list",
                description: "List available MCP servers (Local + Marketplace)",
                inputSchema: { type: "object", properties: {} },
                handler: async () => {
                    const market = await this.marketplace.getIndex();
                    return {
                        content: [{
                                type: "text",
                                text: `Local Registry: ${this.registry.length}\nMarketplace: ${market.length}\n\nTop 10 Marketplace:\n${JSON.stringify(market.slice(0, 10), null, 2)}`
                            }]
                    };
                }
            },
            {
                name: "mcpm_update_index",
                description: "Force update the Marketplace index from GitHub",
                inputSchema: { type: "object", properties: {} },
                handler: async () => {
                    const items = await this.marketplace.updateIndex();
                    return { content: [{ type: "text", text: `Updated index. Found ${items.length} servers.` }] };
                }
            },
            {
                name: "mcpm_search",
                description: "Search for an MCP server in the registry",
                inputSchema: {
                    type: "object",
                    properties: { query: { type: "string" } },
                    required: ["query"]
                },
                handler: async (args) => {
                    const q = args.query.toLowerCase();
                    const localMatches = this.registry.filter(p => p.name.includes(q) ||
                        p.description.toLowerCase().includes(q));
                    const marketIndex = await this.marketplace.getIndex();
                    const marketMatches = marketIndex.filter(p => p.name.toLowerCase().includes(q) ||
                        p.description.toLowerCase().includes(q));
                    return {
                        content: [{
                                type: "text",
                                text: JSON.stringify({ local: localMatches, marketplace: marketMatches.slice(0, 20) }, null, 2)
                            }]
                    };
                }
            },
            {
                name: "mcpm_install",
                description: "Install an MCP server from the registry or marketplace",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        alias: { type: "string", description: "Optional alias for the server" },
                        manualCommand: { type: "string", description: "If marketplace install logic fails, provide command manually (e.g. 'npx -y server')" }
                    },
                    required: ["name"]
                },
                handler: async (args) => {
                    let pkg = this.registry.find(p => p.name === args.name);
                    // If not in local registry, check marketplace
                    if (!pkg) {
                        const market = await this.marketplace.getIndex();
                        const item = market.find(p => p.name === args.name);
                        if (item) {
                            // Marketplace logic: Best Effort
                            // If user provided manual command, use it
                            if (args.manualCommand) {
                                const parts = args.manualCommand.split(" ");
                                pkg = {
                                    name: item.name,
                                    description: item.description,
                                    command: parts[0],
                                    args: parts.slice(1)
                                };
                            }
                            else {
                                // HEURISTIC: Can we guess 'npx -y @modelcontextprotocol/server-[name]'?
                                // Or does the user need to provide it?
                                return {
                                    content: [{
                                            type: "text",
                                            text: `Found '${item.name}' in Marketplace but auto-install is not guaranteed. URL: ${item.url}\nPlease run 'mcpm_install' again with 'manualCommand' (e.g., 'npx -y @modelcontextprotocol/server-${item.name}').`
                                        }]
                                };
                            }
                        }
                    }
                    if (!pkg)
                        return { content: [{ type: "text", text: `Error: Package '${args.name}' not found.` }] };
                    try {
                        let config = {};
                        try {
                            const raw = await fs.readFile(ANTIGRAVITY_CONFIG_PATH, 'utf-8');
                            config = JSON.parse(raw);
                        }
                        catch (e) {
                            // ignore, create new
                        }
                        if (!config.mcpServers)
                            config.mcpServers = {};
                        const key = args.alias || pkg.name;
                        config.mcpServers[key] = {
                            command: pkg.command,
                            args: pkg.args,
                            env: pkg.env || {}
                        };
                        await fs.writeFile(ANTIGRAVITY_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
                        return { content: [{ type: "text", text: `Successfully installed '${pkg.name}' as '${key}'. Restart Antigravity to apply.` }] };
                    }
                    catch (e) {
                        return { content: [{ type: "text", text: `Error installing package: ${e.message}` }] };
                    }
                }
            }
        ];
    }
}
