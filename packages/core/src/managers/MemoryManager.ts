import path from 'path';
import fs from 'fs';
import { VectorStore } from '../services/VectorStore.js';

export class MemoryManager {
    private memoryPath: string;
    private readonly SIMILARITY_THRESHOLD = 0.85; // Content must be <85% similar to be considered unique

    constructor(private dataDir: string, private vectorStore: VectorStore) {
        this.memoryPath = path.join(dataDir, 'memory.json');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        if (!fs.existsSync(this.memoryPath)) fs.writeFileSync(this.memoryPath, '[]');
    }

    /**
     * Check if content is a duplicate of existing memory using Jaccard similarity
     */
    private isDuplicate(newContent: string, existingMemories: Array<{ content: string }>): boolean {
        const normalize = (text: string): Set<string> => {
            return new Set(
                text.toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(word => word.length > 2)
            );
        };

        const newWords = normalize(newContent);
        if (newWords.size === 0) return false;

        for (const memory of existingMemories) {
            const existingWords = normalize(memory.content);
            if (existingWords.size === 0) continue;

            // Jaccard similarity: intersection / union
            const intersection = new Set([...newWords].filter(w => existingWords.has(w)));
            const union = new Set([...newWords, ...existingWords]);
            const similarity = intersection.size / union.size;

            if (similarity >= this.SIMILARITY_THRESHOLD) {
                return true;
            }
        }
        return false;
    }

    async remember(args: { content: string, tags?: string[], skipDedup?: boolean }) {
        // Check for duplicates unless explicitly skipped
        if (!args.skipDedup) {
            const memories = JSON.parse(fs.readFileSync(this.memoryPath, 'utf-8'));
            if (this.isDuplicate(args.content, memories)) {
                return "Memory already exists (deduplicated).";
            }
        }

        const entry = {
            timestamp: new Date().toISOString(),
            content: args.content,
            tags: args.tags || []
        };

        // Save to JSON log
        const memories = JSON.parse(fs.readFileSync(this.memoryPath, 'utf-8'));
        memories.push(entry);
        fs.writeFileSync(this.memoryPath, JSON.stringify(memories, null, 2));

        // Save to Vector Store
        await this.vectorStore.add(args.content, { tags: args.tags, timestamp: entry.timestamp });

        return "Memory saved.";
    }

    async search(args: { query: string }) {
        const results = await this.vectorStore.search(args.query);
        return results.map(r => ({ content: r.content, metadata: r.metadata }));
    }

    async recall(args: { limit?: number }) {
        const memories = JSON.parse(fs.readFileSync(this.memoryPath, 'utf-8'));
        // Return last N memories
        return memories.slice(-(args.limit || 10));
    }

    async getStats() {
        const memories = JSON.parse(fs.readFileSync(this.memoryPath, 'utf-8'));
        return {
            totalEntries: memories.length,
            lastEntry: memories[memories.length - 1]?.timestamp || 'Never',
            dbSize: fs.statSync(this.memoryPath).size
        };
    }

    async consolidateLogs(logs: any[]) {
        // Simple heuristic: concatenate "response" type logs and save as a daily summary.
        const summary = logs
            .filter(l => l.type === 'response')
            .map(l => `Tool: ${l.tool}, Result: ${JSON.stringify(l.result).substring(0, 100)}...`)
            .join('\n');

        if (summary) {
            await this.remember({ content: `Daily Log Summary:\n${summary}`, tags: ['summary', 'logs'] });
            return "Logs consolidated.";
        }
        return "No logs to consolidate.";
    }

    async ingestSession(sessionId: string, sessionData: any) {
        await this.remember({
            content: `Session ${sessionId} summary: ${JSON.stringify(sessionData)}`,
            tags: ['session', sessionId]
        });
    }

    async ingestAgentMessage(agentId: string, message: any) {
        await this.remember({
            content: `Agent ${agentId} message: ${JSON.stringify(message)}`,
            tags: ['agent', agentId]
        });
    }

    async ingestInteraction(data: any) {
        await this.remember({
            content: `Interaction: ${JSON.stringify(data)}`,
            tags: ['interaction']
        });
    }

    getProviders() {
        return [];
    }

    listSnapshots() {
        return [];
    }

    async createSnapshot() {
        return { id: 'snapshot-' + Date.now(), timestamp: new Date().toISOString() };
    }

    async restoreSnapshot(id: string) {
        return { success: true, id };
    }

    getToolDefinitions() {
        return [
            {
                name: "remember",
                description: "Save a piece of information to long-term memory. Automatically deduplicates similar content.",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: { type: "string", description: "The content to remember" },
                        tags: { type: "array", items: { type: "string" }, description: "Optional tags for categorization" },
                        skipDedup: { type: "boolean", description: "Skip deduplication check (default: false)" }
                    },
                    required: ["content"]
                }
            },
            {
                name: "search_memory",
                description: "Semantically search memory for information.",
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
                description: "Recall recent memories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "number" }
                    }
                }
            },
            {
                name: "memory_stats",
                description: "Get statistics about the long-term memory.",
                inputSchema: { type: "object", properties: {} }
            }
        ];
    }
}
