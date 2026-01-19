#!/usr/bin/env node
/**
 * AIOS MCP Router - WebUI CLI Orchestrator
 *
 * This module provides programmatic access to the MCP Router CLI commands.
 * It can be used by the WebUI to execute CLI commands and capture output.
 */
import { spawn } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(spawn);
// ============================================
// MCP Router Commands
// ============================================
/**
 * Discover servers from all registries
 */
export async function discoverServers(dataDir = './data') {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const args = ['discover', '--data-dir', dataDir];
        const result = await execAsync('bun', [cliPath, ...args], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error discovering servers:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Search for servers in the registry
 */
export async function searchServers(query, options = {}) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const args = ['search', query];
        if (options.format) {
            args.push('--format', options.format);
        }
        if (options.category) {
            args.push('--category', options.category);
        }
        if (options.minRating) {
            args.push('--min-rating', options.minRating.toString());
        }
        const result = await execAsync('bun', [cliPath, ...args], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error searching servers:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Get registry statistics
 */
export async function getRegistryStats(dataDir = './data') {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'stats', '--data-dir', dataDir], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error getting stats:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Install a server from the registry
 */
export async function installServer(name, options = {}) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const args = ['install', name];
        if (options.type) {
            args.push('--type', options.type);
        }
        if (options.autoStart !== undefined) {
            args.push('--auto-start', options.autoStart ? 'true' : 'false');
        }
        const result = await execAsync('bun', [cliPath, ...args], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error installing server:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Uninstall a server
 */
export async function uninstallServer(serverId) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'uninstall', serverId], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error uninstalling server:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Check for server updates
 */
export async function checkUpdates() {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'check-updates'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error checking updates:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Update a server
 */
export async function updateServer(serverId) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'update', serverId], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error updating server:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Check server health
 */
export async function checkServerHealth(serverId) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'health', serverId], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error checking health:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
// ============================================
// Configuration Management Commands
// ============================================
/**
 * Auto-detect configurations
 */
export async function detectConfigs(options = {}) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const args = ['detect-configs'];
        if (options.scanPaths) {
            args.push('--scan-paths', options.scanPaths.join(','));
        }
        if (options.recursive !== undefined) {
            args.push('--recursive', options.recursive ? 'true' : 'false');
        }
        const result = await execAsync('bun', [cliPath, ...args], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error detecting configs:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Import configurations from files
 */
export async function importConfigs(filePaths) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'import-configs', ...filePaths], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error importing configs:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Export configurations
 */
export async function exportConfigs(format = 'aios') {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'export-configs', format, '--format', format], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error exporting configs:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
// ============================================
// Session Management Commands
// ============================================
/**
 * Initialize sessions (auto-start all servers)
 */
export async function initializeSessions() {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'init-sessions'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error initializing sessions:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Get session statistics
 */
export async function getSessionStats() {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'session-stats'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error getting session stats:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Get performance metrics for a server
 */
export async function getSessionMetrics(serverName) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'session-metrics', serverName], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error getting session metrics:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * List all sessions
 */
export async function listSessions() {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'list-sessions'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error listing sessions:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Start a session
 */
export async function startSession(serverId) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'start-session', serverId], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error starting session:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Stop a session
 */
export async function stopSession(serverId) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'stop-session', serverId], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error stopping session:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Restart a session
 */
export async function restartSession(serverId) {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'restart-session', serverId], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error restarting session:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
/**
 * Shutdown all sessions
 */
export async function shutdownSessions() {
    try {
        const cliPath = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
        const result = await execAsync('bun', [cliPath, 'shutdown-sessions'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });
        return result.stdout || '';
    }
    catch (error) {
        console.error('Error shutting down sessions:', error.message);
        return JSON.stringify({ error: error.message });
    }
}
// ============================================
// Helper Functions
// ============================================
/**
 * Parse CLI output to JSON
 */
export function parseOutput(output) {
    try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { raw: output };
    }
    catch (error) {
        return { error: error.message, raw: output };
    }
}
/**
 * CLI Orchestrator Main Export
 */
export const MCPRouterCLI = {
    // Registry Management
    discoverServers,
    searchServers,
    getRegistryStats,
    installServer,
    uninstallServer,
    checkUpdates,
    updateServer,
    checkServerHealth,
    // Configuration Management
    detectConfigs,
    importConfigs,
    exportConfigs,
    // Session Management
    initializeSessions,
    getSessionStats,
    getSessionMetrics,
    listSessions,
    startSession,
    stopSession,
    restartSession,
    shutdownSessions,
    // Helpers
    parseOutput
};
