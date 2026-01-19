/**
 * AIOS MCP Router - CLI Integration
 *
 * Integrates MCP Router CLI commands into the main aios CLI
 */
export declare function discoverServers(dataDir?: string): Promise<string>;
export declare function searchServers(query: string, options?: {
    format?: string;
    category?: string;
    minRating?: number;
}): Promise<string>;
export declare function getRegistryStats(dataDir?: string): Promise<string>;
export declare function installServer(name: string, options?: {
    type?: string;
    autoStart?: boolean;
}): Promise<string>;
export declare function uninstallServer(serverId: string): Promise<string>;
export declare function checkUpdates(): Promise<string>;
export declare function updateServer(serverId: string): Promise<string>;
export declare function checkServerHealth(serverId: string): Promise<string>;
export declare function detectConfigs(options?: {
    scanPaths?: string[];
    recursive?: boolean;
}): Promise<string>;
export declare function importConfigs(filePaths: string[]): Promise<string>;
export declare function exportConfigs(format?: 'aios' | 'claude' | 'openai' | 'google'): Promise<string>;
export declare function initializeSessions(): Promise<string>;
export declare function getSessionStats(): Promise<string>;
export declare function getSessionMetrics(serverName: string): Promise<string>;
export declare function listSessions(): Promise<string>;
export declare function startSession(serverId: string): Promise<string>;
export declare function stopSession(serverId: string): Promise<string>;
export declare function restartSession(serverId: string): Promise<string>;
export declare function shutdownSessions(): Promise<string>;
export { MCPCommands } from './cli';
//# sourceMappingURL=mcp-commands.d.ts.map