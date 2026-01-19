/**
 * AIOS MCP Router - CLI Integration
 *
 * Integrates MCP Router CLI commands into the main aios CLI
 */
import { spawn } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(spawn);
const CLI_PATH = process.env.MCP_ROUTER_CLI || './cli/mcp-router-cli/dist/mcp-router-cli.js';
// ============================================
// MCP Router Command Wrappers
// ============================================
export async function discoverServers(dataDir = './data') {
    const args = ['discover', '--data-dir', dataDir, '--format', 'json'];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function searchServers(query, options = {}) {
    const args = ['search', query, '--format', options.format || 'json'];
    if (options.category) {
        args.push('--category', options.category);
    }
    if (options.minRating) {
        args.push('--min-rating', options.minRating.toString());
    }
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function getRegistryStats(dataDir = './data') {
    const args = ['stats', '--data-dir', dataDir];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function installServer(name, options = {}) {
    const args = ['install', name];
    if (options.type) {
        args.push('--type', options.type);
    }
    if (options.autoStart !== undefined) {
        args.push('--auto-start', options.autoStart ? 'true' : 'false');
    }
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function uninstallServer(serverId) {
    const args = ['uninstall', serverId];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function checkUpdates() {
    const args = ['check-updates', '--format', 'json'];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function updateServer(serverId) {
    const args = ['update', serverId];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function checkServerHealth(serverId) {
    const args = ['health', serverId];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function detectConfigs(options = {}) {
    const args = ['detect-configs'];
    if (options.scanPaths) {
        args.push('--scan-paths', options.scanPaths.join(','));
    }
    if (options.recursive !== undefined) {
        args.push('--recursive', options.recursive ? 'true' : 'false');
    }
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function importConfigs(filePaths) {
    const args = ['import-configs', ...filePaths];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function exportConfigs(format = 'aios') {
    const args = ['export-configs', format, '--format', format];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function initializeSessions() {
    const args = ['init-sessions'];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function getSessionStats() {
    const args = ['session-stats'];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function getSessionMetrics(serverName) {
    const args = ['session-metrics', serverName];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function listSessions() {
    const args = ['list-sessions'];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function startSession(serverId) {
    const args = ['start-session', serverId];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function stopSession(serverId) {
    const args = ['stop-session', serverId];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function restartSession(serverId) {
    const args = ['restart-session', serverId];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
export async function shutdownSessions() {
    const args = ['shutdown-sessions'];
    const result = await execAsync('bun', [CLI_PATH, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
    });
    return result.stdout || '';
}
// ============================================
// Main Export
// ============================================
export { MCPCommands } from './cli';
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
    shutdownSessions;
;
