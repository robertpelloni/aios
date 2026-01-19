/**
 * Simple In-Memory MCP Registry
 *
 * Temporary mock implementation to unblock CLI development
 * Will be replaced with proper DatabaseManager integration
 */

export interface RegistryServerDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    rating?: number;
    source: string;
    installed: boolean;
    tools?: number;
}

export interface RegistryStats {
    totalServers: number;
    installedServers: number;
    categories: string[];
    lastSync: Date;
}

export class MockMCPRegistry {
    private servers: Map<string, RegistryServerDefinition>;
    private lastSync: Date;

    constructor() {
        this.servers = new Map();
        this.lastSync = new Date();
        this.initializeMockData();
    }

    private initializeMockData() {
        const mockServers: RegistryServerDefinition[] = [
            {
                id: 'fs-001',
                name: 'filesystem',
                description: 'File system access and manipulation',
                category: 'file-system',
                rating: 4.8,
                source: 'github',
                installed: false,
                tools: 12
            },
            {
                id: 'db-001',
                name: 'sqlite',
                description: 'SQLite database operations',
                category: 'database',
                rating: 4.6,
                source: 'github',
                installed: false,
                tools: 8
            },
            {
                id: 'dev-001',
                name: 'code-analysis',
                description: 'Code analysis and refactoring tools',
                category: 'development',
                rating: 4.7,
                source: 'github',
                installed: false,
                tools: 15
            },
            {
                id: 'api-001',
                name: 'rest-client',
                description: 'REST API client and testing',
                category: 'api',
                rating: 4.5,
                source: 'github',
                installed: false,
                tools: 10
            },
            {
                id: 'ai-001',
                name: 'llm-tools',
                description: 'LLM integration and tools',
                category: 'ai-ml',
                rating: 4.9,
                source: 'github',
                installed: false,
                tools: 20
            }
        ];

        mockServers.forEach(server => {
            this.servers.set(server.id, server);
        });
    }

    discoverServers(dataDir: string = './data'): RegistryServerDefinition[] {
        console.log(`🔍 Discovering servers in ${dataDir}...`);
        return Array.from(this.servers.values());
    }

    searchServers(query: string, category?: string, minRating?: number): RegistryServerDefinition[] {
        let results = Array.from(this.servers.values());

        if (query) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(s =>
                s.name.toLowerCase().includes(lowerQuery) ||
                s.description.toLowerCase().includes(lowerQuery) ||
                s.category.toLowerCase().includes(lowerQuery)
            );
        }

        if (category) {
            results = results.filter(s => s.category === category);
        }

        if (minRating) {
            results = results.filter(s => (s.rating || 0) >= minRating);
        }

        return results;
    }

    getStats(): RegistryStats {
        const servers = Array.from(this.servers.values());
        const categories = new Set(servers.map(s => s.category));

        return {
            totalServers: servers.length,
            installedServers: servers.filter(s => s.installed).length,
            categories: Array.from(categories),
            lastSync: this.lastSync
        };
    }

    getCategories(): string[] {
        const categories = new Set(Array.from(this.servers.values()).map(s => s.category));
        return Array.from(categories).sort();
    }

    installServer(name: string): boolean {
        const server = Array.from(this.servers.values()).find(s => s.name === name);
        if (!server) {
            console.log(`❌ Server not found: ${name}`);
            return false;
        }

        if (server.installed) {
            console.log(`⚠️  Server already installed: ${name}`);
            return true;
        }

        server.installed = true;
        console.log(`✅ Server installed: ${name}`);
        return true;
    }

    uninstallServer(serverId: string): boolean {
        const server = this.servers.get(serverId);
        if (!server) {
            console.log(`❌ Server not found: ${serverId}`);
            return false;
        }

        server.installed = false;
        console.log(`✅ Server uninstalled: ${server.name}`);
        return true;
    }

    checkHealth(serverId: string): { healthy: boolean; status: string } {
        const server = this.servers.get(serverId);
        if (!server) {
            return { healthy: false, status: 'Not found' };
        }

        if (!server.installed) {
            return { healthy: false, status: 'Not installed' };
        }

        return { healthy: true, status: 'Running' };
    }
}
