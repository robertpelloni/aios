#!/usr/bin/env node
/**
 * AIOS MCP Router - WebUI CLI Orchestrator
 *
 * This module provides programmatic access to the MCP Router CLI commands.
 * It can be used by the WebUI to execute CLI commands and capture output.
 */
/**
 * Discover servers from all registries
 */
export declare function discoverServers(dataDir?: string): Promise<string>;
/**
 * Search for servers in the registry
 */
export declare function searchServers(query: string, options?: {
    format?: string;
    category?: string;
    minRating?: number;
}): Promise<string>;
/**
 * Get registry statistics
 */
export declare function getRegistryStats(dataDir?: string): Promise<string>;
/**
 * Install a server from the registry
 */
export declare function installServer(name: string, options?: {
    type?: string;
    autoStart?: boolean;
}): Promise<string>;
/**
 * Uninstall a server
 */
export declare function uninstallServer(serverId: string): Promise<string>;
/**
 * Check for server updates
 */
export declare function checkUpdates(): Promise<string>;
/**
 * Update a server
 */
export declare function updateServer(serverId: string): Promise<string>;
/**
 * Check server health
 */
export declare function checkServerHealth(serverId: string): Promise<string>;
/**
 * Auto-detect configurations
 */
export declare function detectConfigs(options?: {
    scanPaths?: string[];
    recursive?: boolean;
}): Promise<string>;
/**
 * Import configurations from files
 */
export declare function importConfigs(filePaths: string[]): Promise<string>;
/**
 * Export configurations
 */
export declare function exportConfigs(format?: 'aios' | 'claude' | 'openai' | 'google'): Promise<string>;
/**
 * Initialize sessions (auto-start all servers)
 */
export declare function initializeSessions(): Promise<string>;
/**
 * Get session statistics
 */
export declare function getSessionStats(): Promise<string>;
/**
 * Get performance metrics for a server
 */
export declare function getSessionMetrics(serverName: string): Promise<string>;
/**
 * List all sessions
 */
export declare function listSessions(): Promise<string>;
/**
 * Start a session
 */
export declare function startSession(serverId: string): Promise<string>;
/**
 * Stop a session
 */
export declare function stopSession(serverId: string): Promise<string>;
/**
 * Restart a session
 */
export declare function restartSession(serverId: string): Promise<string>;
/**
 * Shutdown all sessions
 */
export declare function shutdownSessions(): Promise<string>;
/**
 * Parse CLI output to JSON
 */
export declare function parseOutput(output: string): any;
/**
 * CLI Orchestrator Main Export
 */
export declare const MCPRouterCLI: {
    discoverServers: typeof discoverServers;
    searchServers: typeof searchServers;
    getRegistryStats: typeof getRegistryStats;
    installServer: typeof installServer;
    uninstallServer: typeof uninstallServer;
    checkUpdates: typeof checkUpdates;
    updateServer: typeof updateServer;
    checkServerHealth: typeof checkServerHealth;
    detectConfigs: typeof detectConfigs;
    importConfigs: typeof importConfigs;
    exportConfigs: typeof exportConfigs;
    initializeSessions: typeof initializeSessions;
    getSessionStats: typeof getSessionStats;
    getSessionMetrics: typeof getSessionMetrics;
    listSessions: typeof listSessions;
    startSession: typeof startSession;
    stopSession: typeof stopSession;
    restartSession: typeof restartSession;
    shutdownSessions: typeof shutdownSessions;
    parseOutput: typeof parseOutput;
};
//# sourceMappingURL=cli.d.ts.map