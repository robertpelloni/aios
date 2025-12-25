import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { SecretManager } from './SecretManager.js';
import { MemoryProvider, MemoryItem, MemoryResult } from '../interfaces/MemoryProvider.js';
import { FileMemoryProvider } from './providers/FileMemoryProvider.js';
import { Mem0Provider } from './providers/Mem0Provider.js';

export class MemoryManager {
    private providers: Map<string, MemoryProvider> = new Map();
    private defaultProviderId: string = 'default-file';
    private snapshotDir: string;
    private openai?: OpenAI;

    constructor(dataDir: string, private secretManager?: SecretManager) {
        this.snapshotDir = path.join(dataDir, 'snapshots');
        
        if (!fs.existsSync(this.snapshotDir)) {
            fs.mkdirSync(this.snapshotDir, { recursive: true });
        }

        // Initialize Default Provider
        const fileProvider = new FileMemoryProvider(dataDir);
        this.registerProvider(fileProvider);

        this.initOpenAI();
        this.detectExternalProviders();
    }

    private async detectExternalProviders() {
        // 1. Check for Mem0
        const mem0Key = this.secretManager?.getSecret('MEM0_API_KEY') || process.env.MEM0_API_KEY;
        if (mem0Key) {
            console.log('[Memory] Detected Mem0 API Key, initializing provider...');
            const mem0 = new Mem0Provider(mem0Key);
            await this.registerProvider(mem0);
        }

        // 2. Check for Docker Containers (Mock logic for now)
        // In a real implementation, we'd use Dockerode to list containers
        // if (docker.hasContainer('chroma')) ...
    }

    public async registerProvider(provider: MemoryProvider) {
        try {
            await provider.connect();
            this.providers.set(provider.id, provider);
            console.log(`[Memory] Registered provider: ${provider.name}`);
        } catch (e) {
            console.error(`[Memory] Failed to register provider ${provider.name}:`, e);
        }
    }

    private initOpenAI() {
        if (this.secretManager) {
            const apiKey = this.secretManager.getSecret('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
            if (apiKey) {
                this.openai = new OpenAI({ apiKey });
            }
        }
    }

    async remember(args: { content: string, tags?: string[], providerId?: string }) {
        const providerId = args.providerId || this.defaultProviderId;
        const provider = this.providers.get(providerId);
        
        if (!provider) return `Provider ${providerId} not found`;

        // Generate embedding if OpenAI is available and provider is local file (which needs help)
        let embedding: number[] | undefined;
        if (this.openai && provider instanceof FileMemoryProvider) {
             embedding = await this.generateEmbedding(args.content);
        }

        const item: MemoryItem = {
            id: Math.random().toString(36).substring(7),
            content: args.content,
            tags: args.tags || [],
            timestamp: Date.now(),
            embedding
        };

        await provider.insert(item);
        return `Memory stored in ${provider.name} with ID: ${item.id}`;
    }

    async search(args: { query: string, providerId?: string }) {
        // If provider specified, search only that
        if (args.providerId) {
            const provider = this.providers.get(args.providerId);
            if (!provider) return [];
            return await provider.search(args.query);
        }

        // Otherwise, search ALL providers and aggregate
        const allResults: MemoryResult[] = [];
        for (const provider of this.providers.values()) {
            try {
                const results = await provider.search(args.query);
                allResults.push(...results);
            } catch (e) {
                console.error(`[Memory] Search failed for ${provider.name}:`, e);
            }
        }
        return allResults;
    }

    // Legacy method for backward compatibility
    async searchSemantic(args: { query: string, limit?: number }) {
        return this.search({ query: args.query });
    }

    async recall(args: { limit?: number, providerId?: string }) {
        const providerId = args.providerId || this.defaultProviderId;
        const provider = this.providers.get(providerId);
        
        if (provider instanceof FileMemoryProvider) {
             // FileProvider specific method, or we add getAll to interface
             const all = await provider.getAll();
             return all.slice(-(args.limit || 10));
        }
        return "Recall not supported on this provider";
    }

    // ... (Keep existing snapshot methods unchanged) ...
    async createSnapshot(args: { sessionId: string, context: any }) {
        const snapshotPath = path.join(this.snapshotDir, `${args.sessionId}_${Date.now()}.json`);
        try {
            fs.writeFileSync(snapshotPath, JSON.stringify(args.context, null, 2));
            return `Snapshot created at ${snapshotPath}`;
        } catch (e) {
            throw new Error(`Failed to create snapshot: ${e}`);
        }
    }

    async listSnapshots(args: { sessionId?: string }) {
        try {
            const files = fs.readdirSync(this.snapshotDir);
            return files
                .filter(f => !args.sessionId || f.startsWith(args.sessionId))
                .map(f => ({ filename: f, path: path.join(this.snapshotDir, f) }));
        } catch (e) {
            return [];
        }
    }

    async restoreSnapshot(args: { filename: string }) {
        const snapshotPath = path.join(this.snapshotDir, args.filename);
        if (!fs.existsSync(snapshotPath)) {
            throw new Error(`Snapshot not found: ${args.filename}`);
        }
        return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    }

    async backfillEmbeddings() {
        // Only relevant for FileProvider currently
        const provider = this.providers.get('default-file');
        if (provider instanceof FileMemoryProvider && this.openai) {
             // Logic to iterate and update would go here
             // For now, we'll skip complex backfill logic in this refactor
             return "Backfill not implemented for multi-provider yet";
        }
        return "No suitable provider for backfill";
    }

    private async generateEmbedding(text: string): Promise<number[] | undefined> {
        if (!this.openai) return undefined;
        try {
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-small",
                input: text,
            });
            return response.data[0].embedding;
        } catch (e) {
            console.error('[Memory] Failed to generate embedding:', e);
            return undefined;
        }
    }

    getProviders() {
        return Array.from(this.providers.values()).map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            capabilities: p.capabilities
        }));
    }

    getToolDefinitions() {
        return [
            {
                name: "remember",
                description: "Store a new memory or fact.",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: { type: "string" },
                        tags: { type: "array", items: { type: "string" } },
                        providerId: { type: "string", description: "Optional: Target specific memory provider" }
                    },
                    required: ["content"]
                }
            },
            {
                name: "search_memory",
                description: "Search stored memories across all providers.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" },
                        providerId: { type: "string" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "list_memory_providers",
                description: "List available memory providers (File, Mem0, Pinecone, etc).",
                inputSchema: { type: "object", properties: {} }
            },
            // ... Snapshot tools ...
            {
                name: "create_snapshot",
                description: "Save the current session context to a snapshot file.",
                inputSchema: {
                    type: "object",
                    properties: {
                        sessionId: { type: "string" },
                        context: { type: "object" }
                    },
                    required: ["sessionId", "context"]
                }
            },
            {
                name: "list_snapshots",
                description: "List available session snapshots.",
                inputSchema: {
                    type: "object",
                    properties: {
                        sessionId: { type: "string" }
                    }
                }
            },
            {
                name: "restore_snapshot",
                description: "Restore context from a snapshot file.",
                inputSchema: {
                    type: "object",
                    properties: {
                        filename: { type: "string" }
                    },
                    required: ["filename"]
                }
            }
        ];
    }
}
