/**
 * AIOS Tool Search Service - Enhanced with MetaMCP Features
 * 
 * Features:
 * - Fuzzy text search (Fuse.js)
 * - Embedding-based semantic search (SQLite compatible)
 * - Hybrid search combining both approaches
 * - Pattern-based filtering (glob patterns)
 * - Server/namespace filtering
 * - Category-based filtering
 * 
 * Note: For SQLite, we store embeddings as JSON arrays and compute
 * cosine similarity in JavaScript. For production scale, consider
 * sqlite-vss extension or external vector store.
 */

import Fuse from 'fuse.js';
import { DatabaseManager, Tool } from '../db/index.js';
import { ModelGateway } from '../gateway/ModelGateway.js';

// ============================================
// Types
// ============================================

export interface ToolDefinition {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
    mcpServerId?: string;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
}

export interface SearchResult {
    tool: ToolDefinition;
    score: number;
    matchType: 'fuzzy' | 'semantic' | 'hybrid' | 'pattern';
}

export interface SearchOptions {
    limit?: number;
    threshold?: number;
    mcpServerId?: string;
    namespaceId?: string;
    category?: string;
    tags?: string[];
    includePatterns?: string[];
    excludePatterns?: string[];
}

export interface HybridSearchOptions extends SearchOptions {
    fuzzyWeight?: number;
    semanticWeight?: number;
}

// ============================================
// ToolSearchService Class
// ============================================

export class ToolSearchService {
    private fuse: Fuse<ToolDefinition>;
    private tools: ToolDefinition[] = [];
    private db: DatabaseManager;
    private modelGateway?: ModelGateway;
    private embeddingCache: Map<string, number[]> = new Map();

    constructor(modelGateway?: ModelGateway, dataDir?: string) {
        this.db = DatabaseManager.getInstance(dataDir);
        this.modelGateway = modelGateway;

        this.fuse = new Fuse([], {
            keys: [
                { name: 'name', weight: 2 },
                { name: 'description', weight: 1.5 },
                { name: 'category', weight: 1 },
                { name: 'tags', weight: 0.8 }
            ],
            threshold: 0.4,
            includeScore: true,
            ignoreLocation: true,
            useExtendedSearch: true
        });
    }

    /**
     * Set tools for in-memory search
     */
    setTools(tools: ToolDefinition[]): void {
        this.tools = tools;
        this.fuse.setCollection(tools);
    }

    /**
     * Sync tools from database
     */
    syncFromDatabase(): void {
        const dbTools = this.db.getAllTools();
        this.tools = dbTools.map(t => this.dbToolToDefinition(t));
        this.fuse.setCollection(this.tools);
    }

    // ============================================
    // Search Methods
    // ============================================

    /**
     * Simple fuzzy text search
     */
    search(query: string, limit = 10): ToolDefinition[] {
        const results = this.fuse.search(query);
        return results.slice(0, limit).map(r => r.item);
    }

    /**
     * Fuzzy search with scores
     */
    fuzzySearch(query: string, options: SearchOptions = {}): SearchResult[] {
        const limit = options.limit ?? 10;
        const threshold = options.threshold ?? 0.6;

        let results = this.fuse.search(query);

        // Apply filters
        const searchResults: SearchResult[] = results.map(r => ({ 
            tool: r.item, 
            score: 1 - (r.score ?? 0),
            matchType: 'fuzzy' as const
        }));
        const filteredResults = this.applyFilters(searchResults, options);

        return filteredResults
            .filter(r => r.score >= threshold)
            .slice(0, limit);
    }

    /**
     * Semantic search using embeddings
     */
    async semanticSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        const limit = options.limit ?? 10;
        const threshold = options.threshold ?? 0.5;

        // Get query embedding
        const queryEmbedding = await this.getEmbedding(query);
        if (!queryEmbedding) {
            console.warn('[ToolSearchService] No embedding model available, falling back to fuzzy search');
            return this.fuzzySearch(query, options);
        }

        // Get all tools with embeddings from database
        const dbTools = this.db.getAllTools(options.mcpServerId ? { mcpServerId: options.mcpServerId } : undefined);
        
        const results: SearchResult[] = [];
        for (const tool of dbTools) {
            if (!tool.embedding || tool.embedding.length === 0) continue;

            const similarity = this.cosineSimilarity(queryEmbedding, tool.embedding);
            if (similarity >= threshold) {
                results.push({
                    tool: this.dbToolToDefinition(tool),
                    score: similarity,
                    matchType: 'semantic'
                });
            }
        }

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        // Apply additional filters
        return this.applyFilters(results, options).slice(0, limit);
    }

    /**
     * Hybrid search combining fuzzy and semantic
     */
    async hybridSearch(query: string, options: HybridSearchOptions = {}): Promise<SearchResult[]> {
        const limit = options.limit ?? 10;
        const fuzzyWeight = options.fuzzyWeight ?? 0.4;
        const semanticWeight = options.semanticWeight ?? 0.6;

        // Run both searches in parallel
        const [fuzzyResults, semanticResults] = await Promise.all([
            Promise.resolve(this.fuzzySearch(query, { ...options, limit: limit * 2 })),
            this.semanticSearch(query, { ...options, limit: limit * 2 })
        ]);

        // Merge results
        const scoreMap = new Map<string, { tool: ToolDefinition; fuzzyScore: number; semanticScore: number }>();

        for (const result of fuzzyResults) {
            scoreMap.set(result.tool.name, {
                tool: result.tool,
                fuzzyScore: result.score,
                semanticScore: 0
            });
        }

        for (const result of semanticResults) {
            const existing = scoreMap.get(result.tool.name);
            if (existing) {
                existing.semanticScore = result.score;
            } else {
                scoreMap.set(result.tool.name, {
                    tool: result.tool,
                    fuzzyScore: 0,
                    semanticScore: result.score
                });
            }
        }

        // Calculate combined scores
        const combined: SearchResult[] = [];
        for (const [, value] of scoreMap) {
            const combinedScore = (value.fuzzyScore * fuzzyWeight) + (value.semanticScore * semanticWeight);
            combined.push({
                tool: value.tool,
                score: combinedScore,
                matchType: 'hybrid'
            });
        }

        // Sort and limit
        combined.sort((a, b) => b.score - a.score);
        return combined.slice(0, limit);
    }

    /**
     * Quick search - fast fuzzy only
     */
    quickSearch(query: string, limit = 10): ToolDefinition[] {
        return this.search(query, limit);
    }

    /**
     * Deep search - thorough hybrid search
     */
    async deepSearch(query: string, limit = 10): Promise<SearchResult[]> {
        return this.hybridSearch(query, { limit, semanticWeight: 0.7, fuzzyWeight: 0.3 });
    }

    // ============================================
    // Pattern-based Filtering
    // ============================================

    /**
     * Filter tools by glob patterns
     */
    filterByPattern(
        tools: ToolDefinition[],
        patterns: string | string[],
        mode: 'include' | 'exclude' = 'include'
    ): ToolDefinition[] {
        const patternList = Array.isArray(patterns) ? patterns : [patterns];
        const regexes = patternList.map(p => this.globToRegex(p));

        return tools.filter(tool => {
            const matches = regexes.some(regex => regex.test(tool.name));
            return mode === 'include' ? matches : !matches;
        });
    }

    /**
     * Filter tools by server
     */
    filterByServer(tools: ToolDefinition[], serverPatterns: string | string[]): ToolDefinition[] {
        const patterns = Array.isArray(serverPatterns) ? serverPatterns : [serverPatterns];
        const regexes = patterns.map(p => this.globToRegex(p));

        return tools.filter(tool => {
            if (!tool.mcpServerId) return false;
            return regexes.some(regex => regex.test(tool.mcpServerId as string));
        });
    }

    /**
     * Filter tools by category
     */
    filterByCategory(tools: ToolDefinition[], categories: string | string[]): ToolDefinition[] {
        const cats = Array.isArray(categories) ? categories : [categories];
        const lowerCats = cats.map(c => c.toLowerCase());

        return tools.filter(tool => {
            if (!tool.category) return false;
            return lowerCats.includes(tool.category.toLowerCase());
        });
    }

    /**
     * Filter tools by tags
     */
    filterByTags(tools: ToolDefinition[], tags: string[], mode: 'any' | 'all' = 'any'): ToolDefinition[] {
        const lowerTags = tags.map(t => t.toLowerCase());

        return tools.filter(tool => {
            if (!tool.tags || tool.tags.length === 0) return false;
            const toolTags = tool.tags.map((t: string) => t.toLowerCase());

            if (mode === 'any') {
                return lowerTags.some(t => toolTags.includes(t));
            } else {
                return lowerTags.every(t => toolTags.includes(t));
            }
        });
    }

    /**
     * Combined filter with multiple criteria
     */
    combineFilters(
        tools: ToolDefinition[],
        config: {
            include?: string | string[];
            exclude?: string | string[];
            servers?: string | string[];
            categories?: string | string[];
            tags?: string[];
        }
    ): ToolDefinition[] {
        let filtered = [...tools];

        if (config.include) {
            filtered = this.filterByPattern(filtered, config.include, 'include');
        }
        if (config.exclude) {
            filtered = this.filterByPattern(filtered, config.exclude, 'exclude');
        }
        if (config.servers) {
            filtered = this.filterByServer(filtered, config.servers);
        }
        if (config.categories) {
            filtered = this.filterByCategory(filtered, config.categories);
        }
        if (config.tags && config.tags.length > 0) {
            filtered = this.filterByTags(filtered, config.tags);
        }

        return filtered;
    }

    // ============================================
    // Embedding Management
    // ============================================

    /**
     * Generate and store embedding for a tool
     */
    async updateToolEmbedding(toolId: string): Promise<void> {
        const tool = this.db.getTool(toolId);
        if (!tool) {
            throw new Error(`Tool not found: ${toolId}`);
        }

        const searchText = this.generateSearchText(tool);
        const embedding = await this.getEmbedding(searchText);

        if (embedding) {
            this.db.updateTool(toolId, { embedding });
        }
    }

    /**
     * Update embeddings for all tools without them
     */
    async updateAllEmbeddings(batchSize = 10): Promise<{ updated: number; failed: number }> {
        const tools = this.db.getAllTools();
        const needsEmbedding = tools.filter(t => !t.embedding || t.embedding.length === 0);

        let updated = 0;
        let failed = 0;

        for (let i = 0; i < needsEmbedding.length; i += batchSize) {
            const batch = needsEmbedding.slice(i, i + batchSize);

            await Promise.all(batch.map(async tool => {
                try {
                    await this.updateToolEmbedding(tool.id);
                    updated++;
                } catch (error) {
                    console.error(`[ToolSearchService] Failed to embed tool ${tool.name}:`, error);
                    failed++;
                }
            }));

            // Rate limiting
            if (i + batchSize < needsEmbedding.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return { updated, failed };
    }

    // ============================================
    // Helpers
    // ============================================

    private async getEmbedding(text: string): Promise<number[] | null> {
        // Check cache first
        const cached = this.embeddingCache.get(text);
        if (cached) return cached;

        // Use model gateway if available
        if (this.modelGateway) {
            try {
                // @ts-ignore - getEmbedding may not exist on all gateways
                const embedding = await this.modelGateway.getEmbedding?.(text);
                if (embedding) {
                    this.embeddingCache.set(text, embedding);
                    return embedding;
                }
            } catch (error) {
                console.warn('[ToolSearchService] Embedding generation failed:', error);
            }
        }

        return null;
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private generateSearchText(tool: Tool): string {
        const parts = [tool.name];

        if (tool.description) {
            parts.push(tool.description);
        }

        if (tool.category) {
            parts.push(`Category: ${tool.category}`);
        }

        if (tool.tags && tool.tags.length > 0) {
            parts.push(`Tags: ${tool.tags.join(', ')}`);
        }

        if (tool.inputSchema) {
            const schema = tool.inputSchema as Record<string, unknown>;
            if (schema.properties) {
                const props = Object.keys(schema.properties as Record<string, unknown>);
                parts.push(`Parameters: ${props.join(', ')}`);
            }
        }

        return parts.join('\n');
    }

    private globToRegex(pattern: string): RegExp {
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${escaped}$`, 'i');
    }

    private dbToolToDefinition(tool: Tool): ToolDefinition {
        return {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            mcpServerId: tool.mcpServerId,
            category: tool.category,
            tags: tool.tags
        };
    }

    private applyFilters(results: SearchResult[], options: SearchOptions): SearchResult[] {
        let filtered = results;

        if (options.mcpServerId) {
            filtered = filtered.filter(r => r.tool.mcpServerId === options.mcpServerId);
        }

        if (options.category) {
            filtered = filtered.filter(r =>
                r.tool.category?.toLowerCase() === options.category?.toLowerCase()
            );
        }

        if (options.tags && options.tags.length > 0) {
            const lowerTags = options.tags.map(t => t.toLowerCase());
            filtered = filtered.filter(r => {
                if (!r.tool.tags) return false;
                const toolTags = (r.tool.tags as string[]).map(t => t.toLowerCase());
                return lowerTags.some(t => toolTags.includes(t));
            });
        }

        if (options.includePatterns && options.includePatterns.length > 0) {
            const regexes = options.includePatterns.map(p => this.globToRegex(p));
            filtered = filtered.filter(r => regexes.some(rx => rx.test(r.tool.name)));
        }

        if (options.excludePatterns && options.excludePatterns.length > 0) {
            const regexes = options.excludePatterns.map(p => this.globToRegex(p));
            filtered = filtered.filter(r => !regexes.some(rx => rx.test(r.tool.name)));
        }

        return filtered;
    }

    /**
     * Get statistics about indexed tools
     */
    getStats(): {
        totalTools: number;
        toolsWithEmbeddings: number;
        categories: string[];
        servers: number;
    } {
        const tools = this.db.getAllTools();
        const categories = [...new Set(tools.filter(t => t.category).map(t => t.category as string))];
        const servers = [...new Set(tools.map(t => t.mcpServerId))];
        const withEmbeddings = tools.filter(t => t.embedding && t.embedding.length > 0).length;

        return {
            totalTools: tools.length,
            toolsWithEmbeddings: withEmbeddings,
            categories,
            servers: servers.length
        };
    }
}
