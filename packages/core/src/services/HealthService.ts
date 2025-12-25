import { EventEmitter } from 'events';
import { McpManager } from '../managers/McpManager.js';

interface ClientInfo {
    id: string;
    type: string; // 'vscode', 'browser', 'cli'
    connectedAt: number;
}

export class HealthService extends EventEmitter {
    private connectedClients: Map<string, ClientInfo> = new Map();

    constructor(private mcpManager: McpManager) {
        super();
    }

    registerClient(id: string, type: string) {
        this.connectedClients.set(id, {
            id,
            type,
            connectedAt: Date.now()
        });
        this.emit('clientsUpdated', this.getClients());
        console.log(`[HealthService] Client connected: ${type} (${id})`);
    }

    unregisterClient(id: string) {
        if (this.connectedClients.has(id)) {
            const client = this.connectedClients.get(id);
            this.connectedClients.delete(id);
            this.emit('clientsUpdated', this.getClients());
            console.log(`[HealthService] Client disconnected: ${client?.type} (${id})`);
        }
    }

    getClients() {
        return Array.from(this.connectedClients.values());
    }

    getSystemStatus() {
        const clients = this.getClients();
        const mcps = this.mcpManager.getServers();

        return {
            status: 'operational',
            uptime: process.uptime(),
            connections: {
                total: clients.length,
                vscode: clients.filter(c => c.type === 'vscode').length,
                browser: clients.filter(c => c.type === 'browser').length,
                cli: clients.filter(c => c.type === 'cli').length
            },
            mcp: {
                total: mcps.length,
                running: mcps.filter(s => s.status === 'running').length
            }
        };
    }
}
