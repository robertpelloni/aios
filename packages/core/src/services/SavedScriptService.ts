/**
 * AIOS Saved Script Service
 * Manages user-saved code snippets with execution tracking
 * 
 * Features:
 * - CRUD operations for saved scripts
 * - Favorites and tagging system
 * - Execution count tracking
 * - Integration with CodeExecutorService
 */

import { EventEmitter } from 'events';
import { DatabaseManager, SavedScript } from '../db/index.js';
import { CodeExecutorService, ToolCallCallback, ExecutionResult, ExecutionOptions } from './CodeExecutorService.js';

// ============================================
// Types
// ============================================

export interface CreateScriptInput {
    name: string;
    code: string;
    description?: string;
    language?: 'typescript' | 'javascript' | 'python';
    tags?: string[];
    isFavorite?: boolean;
}

export interface UpdateScriptInput {
    name?: string;
    code?: string;
    description?: string;
    language?: 'typescript' | 'javascript' | 'python';
    tags?: string[];
    isFavorite?: boolean;
}

export interface ScriptSearchOptions {
    query?: string;
    language?: 'typescript' | 'javascript' | 'python';
    tags?: string[];
    favoritesOnly?: boolean;
    limit?: number;
}

// ============================================
// SavedScriptService Class
// ============================================

export class SavedScriptService extends EventEmitter {
    private db: DatabaseManager;
    private executor: CodeExecutorService;

    constructor(db?: DatabaseManager, executor?: CodeExecutorService) {
        super();
        this.db = db ?? DatabaseManager.getInstance();
        this.executor = executor ?? new CodeExecutorService();
    }

    // ============================================
    // CRUD Operations
    // ============================================

    /**
     * Create a new saved script
     */
    createScript(input: CreateScriptInput): SavedScript {
        // Validate syntax for JS/TS
        if (input.language !== 'python') {
            const validation = this.executor.validateSyntax(input.code);
            // Note: validateSyntax is async but we want sync create
            // Validation happens on execute, not create
        }

        const script = this.db.createSavedScript({
            name: input.name,
            code: input.code,
            description: input.description,
            language: input.language ?? 'javascript',
            tags: input.tags,
            isFavorite: input.isFavorite ?? false
        });

        this.emit('script:created', script);
        return script;
    }

    /**
     * Get a script by ID
     */
    getScript(id: string): SavedScript | null {
        const scripts = this.db.getAllSavedScripts();
        return scripts.find(s => s.id === id) || null;
    }

    /**
     * Get a script by name
     */
    getScriptByName(name: string): SavedScript | null {
        const scripts = this.db.getAllSavedScripts();
        return scripts.find(s => s.name === name) || null;
    }

    /**
     * Get all saved scripts
     */
    getAllScripts(): SavedScript[] {
        return this.db.getAllSavedScripts();
    }

    /**
     * Search scripts with filters
     */
    searchScripts(options: ScriptSearchOptions = {}): SavedScript[] {
        let scripts = this.db.getAllSavedScripts();

        // Filter by language
        if (options.language) {
            scripts = scripts.filter(s => s.language === options.language);
        }

        // Filter by favorites
        if (options.favoritesOnly) {
            scripts = scripts.filter(s => s.isFavorite);
        }

        // Filter by tags
        if (options.tags && options.tags.length > 0) {
            scripts = scripts.filter(s => 
                s.tags && options.tags!.some(tag => s.tags!.includes(tag))
            );
        }

        // Search by query (name and description)
        if (options.query) {
            const lowerQuery = options.query.toLowerCase();
            scripts = scripts.filter(s =>
                s.name.toLowerCase().includes(lowerQuery) ||
                (s.description && s.description.toLowerCase().includes(lowerQuery))
            );
        }

        // Apply limit
        if (options.limit && options.limit > 0) {
            scripts = scripts.slice(0, options.limit);
        }

        return scripts;
    }

    /**
     * Update an existing script
     */
    updateScript(id: string, input: UpdateScriptInput): SavedScript | null {
        const existing = this.getScript(id);
        if (!existing) return null;

        // Build updated script
        const updated: SavedScript = {
            ...existing,
            name: input.name ?? existing.name,
            code: input.code ?? existing.code,
            description: input.description ?? existing.description,
            language: input.language ?? existing.language,
            tags: input.tags ?? existing.tags,
            isFavorite: input.isFavorite ?? existing.isFavorite,
            updatedAt: Date.now()
        };

        // We need to delete and recreate since DatabaseManager doesn't have updateSavedScript
        this.db.deleteSavedScript(id);
        const newScript = this.db.createSavedScript({
            name: updated.name,
            code: updated.code,
            description: updated.description,
            language: updated.language,
            tags: updated.tags,
            isFavorite: updated.isFavorite
        });

        this.emit('script:updated', newScript);
        return newScript;
    }

    /**
     * Delete a script
     */
    deleteScript(id: string): boolean {
        const result = this.db.deleteSavedScript(id);
        if (result) {
            this.emit('script:deleted', id);
        }
        return result;
    }

    /**
     * Toggle favorite status
     */
    toggleFavorite(id: string): SavedScript | null {
        const script = this.getScript(id);
        if (!script) return null;

        return this.updateScript(id, { isFavorite: !script.isFavorite });
    }

    // ============================================
    // Execution
    // ============================================

    /**
     * Execute a saved script by ID
     */
    async executeScript(
        id: string,
        callTool: ToolCallCallback,
        options: ExecutionOptions = {}
    ): Promise<ExecutionResult & { script?: SavedScript }> {
        const script = this.getScript(id);
        if (!script) {
            return {
                success: false,
                error: `Script not found: ${id}`,
                logs: [],
                durationMs: 0
            };
        }

        return this.executeScriptContent(script, callTool, options);
    }

    /**
     * Execute a saved script by name
     */
    async executeScriptByName(
        name: string,
        callTool: ToolCallCallback,
        options: ExecutionOptions = {}
    ): Promise<ExecutionResult & { script?: SavedScript }> {
        const script = this.getScriptByName(name);
        if (!script) {
            return {
                success: false,
                error: `Script not found: ${name}`,
                logs: [],
                durationMs: 0
            };
        }

        return this.executeScriptContent(script, callTool, options);
    }

    /**
     * Execute script content directly
     */
    private async executeScriptContent(
        script: SavedScript,
        callTool: ToolCallCallback,
        options: ExecutionOptions
    ): Promise<ExecutionResult & { script: SavedScript }> {
        // Only support JS/TS for now
        if (script.language === 'python') {
            return {
                success: false,
                error: 'Python execution not yet supported',
                logs: [],
                durationMs: 0,
                script
            };
        }

        this.emit('script:executing', { id: script.id, name: script.name });

        const result = await this.executor.executeCode(
            script.code,
            callTool,
            { ...options, scriptId: script.id }
        );

        // Update run count
        this.db.incrementScriptRunCount(script.id);

        this.emit('script:executed', {
            id: script.id,
            name: script.name,
            success: result.success,
            durationMs: result.durationMs
        });

        return { ...result, script };
    }

    /**
     * Validate script syntax
     */
    async validateScript(id: string): Promise<{ valid: boolean; error?: string }> {
        const script = this.getScript(id);
        if (!script) {
            return { valid: false, error: `Script not found: ${id}` };
        }

        if (script.language === 'python') {
            return { valid: true }; // Can't validate Python syntax here
        }

        return this.executor.validateSyntax(script.code);
    }

    // ============================================
    // Utility
    // ============================================

    /**
     * Get all unique tags across all scripts
     */
    getAllTags(): string[] {
        const scripts = this.db.getAllSavedScripts();
        const tagSet = new Set<string>();

        for (const script of scripts) {
            if (script.tags) {
                for (const tag of script.tags) {
                    tagSet.add(tag);
                }
            }
        }

        return Array.from(tagSet).sort();
    }

    /**
     * Get script statistics
     */
    getStats(): {
        total: number;
        byLanguage: Record<string, number>;
        favorites: number;
        totalRuns: number;
    } {
        const scripts = this.db.getAllSavedScripts();
        
        const byLanguage: Record<string, number> = {};
        let favorites = 0;
        let totalRuns = 0;

        for (const script of scripts) {
            byLanguage[script.language] = (byLanguage[script.language] || 0) + 1;
            if (script.isFavorite) favorites++;
            totalRuns += script.runCount;
        }

        return {
            total: scripts.length,
            byLanguage,
            favorites,
            totalRuns
        };
    }

    /**
     * Import scripts from JSON
     */
    importScripts(scripts: CreateScriptInput[]): { imported: number; errors: string[] } {
        let imported = 0;
        const errors: string[] = [];

        for (const script of scripts) {
            try {
                this.createScript(script);
                imported++;
            } catch (error) {
                errors.push(`Failed to import "${script.name}": ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return { imported, errors };
    }

    /**
     * Export all scripts to JSON
     */
    exportScripts(): CreateScriptInput[] {
        return this.db.getAllSavedScripts().map(s => ({
            name: s.name,
            code: s.code,
            description: s.description,
            language: s.language,
            tags: s.tags,
            isFavorite: s.isFavorite
        }));
    }
}

// Export singleton factory
let instance: SavedScriptService | null = null;

export function getSavedScriptService(
    db?: DatabaseManager,
    executor?: CodeExecutorService
): SavedScriptService {
    if (!instance) {
        instance = new SavedScriptService(db, executor);
    }
    return instance;
}
