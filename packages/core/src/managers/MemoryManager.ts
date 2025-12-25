import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';

interface MemoryItem {
    id: string;
    content: string;
    tags: string[];
    timestamp: number;
}

export class MemoryManager {
    private memories: MemoryItem[] = [];
    private dataFile: string;
    private snapshotDir: string;
    private fuse: Fuse<MemoryItem>;

    constructor(dataDir: string) {
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

    async remember(args: { content: string, tags?: string[] }) {
        const item: MemoryItem = {
            id: Math.random().toString(36).substring(7),
            content: args.content,
            tags: args.tags || [],
            timestamp: Date.now()
        };
        this.memories.push(item);
        this.fuse.setCollection(this.memories);
        this.save();
        return `Memory stored with ID: ${item.id}`;
    }

    async search(args: { query: string }) {
        const results = this.fuse.search(args.query);
        return results.map(r => r.item);
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
            }
        ];
    }
}
