import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';
import OpenAI from 'openai';
import { SecretManager } from './SecretManager.js';

interface MemoryItem {
    id: string;
    content: string;
    tags: string[];
    timestamp: number;
    embedding?: number[];
}

export class MemoryManager {
    private memories: MemoryItem[] = [];
    private dataFile: string;
    private snapshotDir: string;
    private fuse: Fuse<MemoryItem>;
    private openai?: OpenAI;

    constructor(dataDir: string, private secretManager?: SecretManager) {
        if (!fs.existsSync(dataDir)) {
            try {
                fs.mkdirSync(dataDir, { recursive: true });
            } catch (e) {
                console.error('[Memory] Failed to create data dir:', e);
            }
        }
        this.dataFile = path.join(dataDir, 'memory.json');
        this.snapshotDir = path.join(dataDir, 'snapshots');
        
        if (!fs.existsSync(this.snapshotDir)) {
            fs.mkdirSync(this.snapshotDir, { recursive: true });
        }

        this.fuse = new Fuse([], {
            keys: ['content', 'tags'],
            threshold: 0.4
        });

        this.load();
        this.initOpenAI();
    }

    private initOpenAI() {
        if (this.secretManager) {
            const apiKey = this.secretManager.getSecret('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
            if (apiKey) {
                this.openai = new OpenAI({ apiKey });
                console.log('[Memory] Semantic search enabled (OpenAI)');
            }
        }
    }

    private load() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = fs.readFileSync(this.dataFile, 'utf-8');
                this.memories = JSON.parse(data);
                this.fuse.setCollection(this.memories);
                console.log(`[Memory] Loaded ${this.memories.length} items`);
            }
        } catch (e) {
            console.error('[Memory] Failed to load memory:', e);
        }
    }

    private save() {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(this.memories, null, 2));
        } catch (e) {
            console.error('[Memory] Failed to save memory:', e);
        }
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

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async remember(args: { content: string, tags?: string[] }) {
        const embedding = await this.generateEmbedding(args.content);
        
        const item: MemoryItem = {
            id: Math.random().toString(36).substring(7),
            content: args.content,
            tags: args.tags || [],
            timestamp: Date.now(),
            embedding
        };
        this.memories.push(item);
        this.fuse.setCollection(this.memories);
        this.save();
        return `Memory stored with ID: ${item.id} ${embedding ? '(Embedded)' : ''}`;
    }

    async search(args: { query: string }) {
        const results = this.fuse.search(args.query);
        return results.map(r => r.item);
    }

    async searchSemantic(args: { query: string, limit?: number }) {
        if (!this.openai) {
            return "Semantic search unavailable (Missing OpenAI API Key)";
        }
        
        const queryEmbedding = await this.generateEmbedding(args.query);
        if (!queryEmbedding) return "Failed to generate query embedding";

        const limit = args.limit || 5;
        
        return this.memories
            .filter(m => m.embedding)
            .map(m => ({
                item: m,
                score: this.cosineSimilarity(queryEmbedding, m.embedding!)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(r => ({ ...r.item, similarity: r.score }));
    }

    async backfillEmbeddings() {
        if (!this.openai) return "OpenAI not initialized";
        let count = 0;
        console.log(`[Memory] Starting embedding backfill for ${this.memories.length} items...`);
        
        for (const memory of this.memories) {
            if (!memory.embedding) {
                const embedding = await this.generateEmbedding(memory.content);
                if (embedding) {
                    memory.embedding = embedding;
                    count++;
                    // Rate limit protection (simple)
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
        
        if (count > 0) {
            this.save();
            this.fuse.setCollection(this.memories);
        }
        return `Backfilled embeddings for ${count} memories`;
    }

    async recall(args: { limit?: number }) {
        const limit = args.limit || 10;
        return this.memories.slice(-limit);
    }

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

    getToolDefinitions() {
        return [
            {
                name: "remember",
                description: "Store a new memory or fact for later retrieval.",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: { type: "string" },
                        tags: { type: "array", items: { type: "string" } }
                    },
                    required: ["content"]
                }
            },
            {
                name: "search_memory",
                description: "Search stored memories by content or tags.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "semantic_search",
                description: "Search stored memories using semantic similarity (requires OpenAI API Key).",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" },
                        limit: { type: "number" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "recall_recent",
                description: "Retrieve the most recent memories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "number" }
                    }
                }
            },
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
            },
            {
                name: "embed_memories",
                description: "Generate embeddings for all memories that lack them (requires OpenAI API Key).",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            }
        ];
    }
}
