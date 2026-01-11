/**
 * AIOS Database Manager
 * Centralized SQLite database access with full CRUD for all MetaMCP-migrated tables
 */

import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
    SQL_SCHEMA,
    generateId,
    toDbRow,
    fromDbRow,
    McpServer,
    Tool,
    Namespace,
    Endpoint,
    NamespaceServerMapping,
    NamespaceToolMapping,
    ApiKey,
    Policy,
    ToolCallLog,
    SavedScript,
    ToolSet,
    McpServerType,
    ToolStatus,
    PolicyRule
} from './schema.js';

export class DatabaseManager extends EventEmitter {
    private db: Database.Database;
    private static instance: DatabaseManager | null = null;

    constructor(dataDir?: string) {
        super();
        const dir = dataDir || path.join(process.cwd(), 'data');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const dbPath = path.join(dir, 'aios.db');
        this.db = new Database(dbPath);
        
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        
        // Initialize schema
        this.db.exec(SQL_SCHEMA);
        
        console.log(`[DatabaseManager] Initialized at ${dbPath}`);
    }

    static getInstance(dataDir?: string): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager(dataDir);
        }
        return DatabaseManager.instance;
    }

    // ============================================
    // MCP Servers
    // ============================================

    createMcpServer(server: Omit<McpServer, 'id' | 'createdAt' | 'updatedAt'>): McpServer {
        const now = Date.now();
        const fullServer: McpServer = {
            id: generateId(),
            ...server,
            createdAt: now,
            updatedAt: now
        };

        const stmt = this.db.prepare(`
            INSERT INTO mcp_servers (id, name, type, command, args, env, url, bearer_token, headers, description, icon, enabled, created_at, updated_at)
            VALUES (@id, @name, @type, @command, @args, @env, @url, @bearer_token, @headers, @description, @icon, @enabled, @created_at, @updated_at)
        `);

        stmt.run({
            id: fullServer.id,
            name: fullServer.name,
            type: fullServer.type,
            command: fullServer.command || null,
            args: fullServer.args ? JSON.stringify(fullServer.args) : null,
            env: fullServer.env ? JSON.stringify(fullServer.env) : null,
            url: fullServer.url || null,
            bearer_token: fullServer.bearerToken || null,
            headers: fullServer.headers ? JSON.stringify(fullServer.headers) : null,
            description: fullServer.description || null,
            icon: fullServer.icon || null,
            enabled: fullServer.enabled ? 1 : 0,
            created_at: fullServer.createdAt,
            updated_at: fullServer.updatedAt
        });

        this.emit('server:created', fullServer);
        return fullServer;
    }

    getMcpServer(id: string): McpServer | null {
        const stmt = this.db.prepare('SELECT * FROM mcp_servers WHERE id = ?');
        const row = stmt.get(id) as Record<string, unknown> | undefined;
        if (!row) return null;
        return fromDbRow<McpServer>(row, ['args', 'env', 'headers']);
    }

    getMcpServerByName(name: string): McpServer | null {
        const stmt = this.db.prepare('SELECT * FROM mcp_servers WHERE name = ?');
        const row = stmt.get(name) as Record<string, unknown> | undefined;
        if (!row) return null;
        return fromDbRow<McpServer>(row, ['args', 'env', 'headers']);
    }

    getAllMcpServers(filter?: { type?: McpServerType; enabled?: boolean }): McpServer[] {
        let query = 'SELECT * FROM mcp_servers WHERE 1=1';
        const params: unknown[] = [];

        if (filter?.type) {
            query += ' AND type = ?';
            params.push(filter.type);
        }
        if (filter?.enabled !== undefined) {
            query += ' AND enabled = ?';
            params.push(filter.enabled ? 1 : 0);
        }

        query += ' ORDER BY name ASC';

        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as Record<string, unknown>[];
        return rows.map(row => fromDbRow<McpServer>(row, ['args', 'env', 'headers']));
    }

    updateMcpServer(id: string, updates: Partial<Omit<McpServer, 'id' | 'createdAt'>>): McpServer | null {
        const existing = this.getMcpServer(id);
        if (!existing) return null;

        const updated = { ...existing, ...updates, updatedAt: Date.now() };

        const stmt = this.db.prepare(`
            UPDATE mcp_servers SET
                name = @name, type = @type, command = @command, args = @args, env = @env,
                url = @url, bearer_token = @bearer_token, headers = @headers,
                description = @description, icon = @icon, enabled = @enabled, updated_at = @updated_at
            WHERE id = @id
        `);

        stmt.run({
            id: updated.id,
            name: updated.name,
            type: updated.type,
            command: updated.command || null,
            args: updated.args ? JSON.stringify(updated.args) : null,
            env: updated.env ? JSON.stringify(updated.env) : null,
            url: updated.url || null,
            bearer_token: updated.bearerToken || null,
            headers: updated.headers ? JSON.stringify(updated.headers) : null,
            description: updated.description || null,
            icon: updated.icon || null,
            enabled: updated.enabled ? 1 : 0,
            updated_at: updated.updatedAt
        });

        this.emit('server:updated', updated);
        return updated;
    }

    deleteMcpServer(id: string): boolean {
        const stmt = this.db.prepare('DELETE FROM mcp_servers WHERE id = ?');
        const result = stmt.run(id);
        if (result.changes > 0) {
            this.emit('server:deleted', id);
            return true;
        }
        return false;
    }

    // ============================================
    // Tools
    // ============================================

    createTool(tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Tool {
        const now = Date.now();
        const fullTool: Tool = {
            id: generateId(),
            ...tool,
            usageCount: 0,
            createdAt: now,
            updatedAt: now
        };

        const stmt = this.db.prepare(`
            INSERT INTO tools (id, name, description, input_schema, mcp_server_id, embedding, category, tags, usage_count, last_used_at, created_at, updated_at)
            VALUES (@id, @name, @description, @input_schema, @mcp_server_id, @embedding, @category, @tags, @usage_count, @last_used_at, @created_at, @updated_at)
        `);

        stmt.run({
            id: fullTool.id,
            name: fullTool.name,
            description: fullTool.description || null,
            input_schema: fullTool.inputSchema ? JSON.stringify(fullTool.inputSchema) : null,
            mcp_server_id: fullTool.mcpServerId,
            embedding: fullTool.embedding ? JSON.stringify(fullTool.embedding) : null,
            category: fullTool.category || null,
            tags: fullTool.tags ? JSON.stringify(fullTool.tags) : null,
            usage_count: fullTool.usageCount,
            last_used_at: fullTool.lastUsedAt || null,
            created_at: fullTool.createdAt,
            updated_at: fullTool.updatedAt
        });

        this.emit('tool:created', fullTool);
        return fullTool;
    }

    getTool(id: string): Tool | null {
        const stmt = this.db.prepare('SELECT * FROM tools WHERE id = ?');
        const row = stmt.get(id) as Record<string, unknown> | undefined;
        if (!row) return null;
        return fromDbRow<Tool>(row, ['inputSchema', 'embedding', 'tags']);
    }

    getToolByName(name: string, mcpServerId?: string): Tool | null {
        let query = 'SELECT * FROM tools WHERE name = ?';
        const params: unknown[] = [name];
        
        if (mcpServerId) {
            query += ' AND mcp_server_id = ?';
            params.push(mcpServerId);
        }

        const stmt = this.db.prepare(query);
        const row = stmt.get(...params) as Record<string, unknown> | undefined;
        if (!row) return null;
        return fromDbRow<Tool>(row, ['inputSchema', 'embedding', 'tags']);
    }

    getToolsByServer(mcpServerId: string): Tool[] {
        const stmt = this.db.prepare('SELECT * FROM tools WHERE mcp_server_id = ? ORDER BY name ASC');
        const rows = stmt.all(mcpServerId) as Record<string, unknown>[];
        return rows.map(row => fromDbRow<Tool>(row, ['inputSchema', 'embedding', 'tags']));
    }

    getAllTools(filter?: { category?: string; mcpServerId?: string }): Tool[] {
        let query = 'SELECT * FROM tools WHERE 1=1';
        const params: unknown[] = [];

        if (filter?.category) {
            query += ' AND category = ?';
            params.push(filter.category);
        }
        if (filter?.mcpServerId) {
            query += ' AND mcp_server_id = ?';
            params.push(filter.mcpServerId);
        }

        query += ' ORDER BY usage_count DESC, name ASC';

        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as Record<string, unknown>[];
        return rows.map(row => fromDbRow<Tool>(row, ['inputSchema', 'embedding', 'tags']));
    }

    updateTool(id: string, updates: Partial<Omit<Tool, 'id' | 'createdAt'>>): Tool | null {
        const existing = this.getTool(id);
        if (!existing) return null;

        const updated = { ...existing, ...updates, updatedAt: Date.now() };

        const stmt = this.db.prepare(`
            UPDATE tools SET
                name = @name, description = @description, input_schema = @input_schema,
                mcp_server_id = @mcp_server_id, embedding = @embedding, category = @category,
                tags = @tags, usage_count = @usage_count, last_used_at = @last_used_at, updated_at = @updated_at
            WHERE id = @id
        `);

        stmt.run({
            id: updated.id,
            name: updated.name,
            description: updated.description || null,
            input_schema: updated.inputSchema ? JSON.stringify(updated.inputSchema) : null,
            mcp_server_id: updated.mcpServerId,
            embedding: updated.embedding ? JSON.stringify(updated.embedding) : null,
            category: updated.category || null,
            tags: updated.tags ? JSON.stringify(updated.tags) : null,
            usage_count: updated.usageCount,
            last_used_at: updated.lastUsedAt || null,
            updated_at: updated.updatedAt
        });

        this.emit('tool:updated', updated);
        return updated;
    }

    incrementToolUsage(id: string): void {
        const stmt = this.db.prepare(`
            UPDATE tools SET usage_count = usage_count + 1, last_used_at = ?, updated_at = ? WHERE id = ?
        `);
        const now = Date.now();
        stmt.run(now, now, id);
    }

    deleteTool(id: string): boolean {
        const stmt = this.db.prepare('DELETE FROM tools WHERE id = ?');
        const result = stmt.run(id);
        if (result.changes > 0) {
            this.emit('tool:deleted', id);
            return true;
        }
        return false;
    }

    // ============================================
    // Namespaces
    // ============================================

    createNamespace(ns: Omit<Namespace, 'id' | 'createdAt' | 'updatedAt'>): Namespace {
        const now = Date.now();
        const fullNs: Namespace = {
            id: generateId(),
            ...ns,
            createdAt: now,
            updatedAt: now
        };

        const stmt = this.db.prepare(`
            INSERT INTO namespaces (id, name, description, icon, is_default, created_at, updated_at)
            VALUES (@id, @name, @description, @icon, @is_default, @created_at, @updated_at)
        `);

        stmt.run({
            id: fullNs.id,
            name: fullNs.name,
            description: fullNs.description || null,
            icon: fullNs.icon || null,
            is_default: fullNs.isDefault ? 1 : 0,
            created_at: fullNs.createdAt,
            updated_at: fullNs.updatedAt
        });

        this.emit('namespace:created', fullNs);
        return fullNs;
    }

    getNamespace(id: string): Namespace | null {
        const stmt = this.db.prepare('SELECT * FROM namespaces WHERE id = ?');
        const row = stmt.get(id) as Record<string, unknown> | undefined;
        if (!row) return null;
        return fromDbRow<Namespace>(row, []);
    }

    getDefaultNamespace(): Namespace | null {
        const stmt = this.db.prepare('SELECT * FROM namespaces WHERE is_default = 1 LIMIT 1');
        const row = stmt.get() as Record<string, unknown> | undefined;
        if (!row) return null;
        return fromDbRow<Namespace>(row, []);
    }

    getAllNamespaces(): Namespace[] {
        const stmt = this.db.prepare('SELECT * FROM namespaces ORDER BY is_default DESC, name ASC');
        const rows = stmt.all() as Record<string, unknown>[];
        return rows.map(row => fromDbRow<Namespace>(row, []));
    }

    updateNamespace(id: string, updates: Partial<Omit<Namespace, 'id' | 'createdAt'>>): Namespace | null {
        const existing = this.getNamespace(id);
        if (!existing) return null;

        const updated = { ...existing, ...updates, updatedAt: Date.now() };

        const stmt = this.db.prepare(`
            UPDATE namespaces SET name = @name, description = @description, icon = @icon, is_default = @is_default, updated_at = @updated_at
            WHERE id = @id
        `);

        stmt.run({
            id: updated.id,
            name: updated.name,
            description: updated.description || null,
            icon: updated.icon || null,
            is_default: updated.isDefault ? 1 : 0,
            updated_at: updated.updatedAt
        });

        this.emit('namespace:updated', updated);
        return updated;
    }

    deleteNamespace(id: string): boolean {
        // Don't delete the default namespace
        const ns = this.getNamespace(id);
        if (!ns || ns.isDefault) return false;

        const stmt = this.db.prepare('DELETE FROM namespaces WHERE id = ?');
        const result = stmt.run(id);
        if (result.changes > 0) {
            this.emit('namespace:deleted', id);
            return true;
        }
        return false;
    }

    // ============================================
    // Namespace Server Mappings
    // ============================================

    addServerToNamespace(namespaceId: string, mcpServerId: string, priority: number = 0): NamespaceServerMapping {
        const mapping: NamespaceServerMapping = {
            id: generateId(),
            namespaceId,
            mcpServerId,
            priority,
            createdAt: Date.now()
        };

        const stmt = this.db.prepare(`
            INSERT INTO namespace_server_mappings (id, namespace_id, mcp_server_id, priority, created_at)
            VALUES (@id, @namespace_id, @mcp_server_id, @priority, @created_at)
        `);

        stmt.run({
            id: mapping.id,
            namespace_id: mapping.namespaceId,
            mcp_server_id: mapping.mcpServerId,
            priority: mapping.priority,
            created_at: mapping.createdAt
        });

        return mapping;
    }

    removeServerFromNamespace(namespaceId: string, mcpServerId: string): boolean {
        const stmt = this.db.prepare('DELETE FROM namespace_server_mappings WHERE namespace_id = ? AND mcp_server_id = ?');
        const result = stmt.run(namespaceId, mcpServerId);
        return result.changes > 0;
    }

    getServersInNamespace(namespaceId: string): McpServer[] {
        const stmt = this.db.prepare(`
            SELECT s.* FROM mcp_servers s
            JOIN namespace_server_mappings m ON s.id = m.mcp_server_id
            WHERE m.namespace_id = ?
            ORDER BY m.priority ASC, s.name ASC
        `);
        const rows = stmt.all(namespaceId) as Record<string, unknown>[];
        return rows.map(row => fromDbRow<McpServer>(row, ['args', 'env', 'headers']));
    }

    // ============================================
    // Endpoints
    // ============================================

    createEndpoint(endpoint: Omit<Endpoint, 'id' | 'createdAt' | 'updatedAt'>): Endpoint {
        const now = Date.now();
        const fullEndpoint: Endpoint = {
            id: generateId(),
            ...endpoint,
            createdAt: now,
            updatedAt: now
        };

        const stmt = this.db.prepare(`
            INSERT INTO endpoints (id, name, path, namespace_id, api_key_id, enabled, created_at, updated_at)
            VALUES (@id, @name, @path, @namespace_id, @api_key_id, @enabled, @created_at, @updated_at)
        `);

        stmt.run({
            id: fullEndpoint.id,
            name: fullEndpoint.name,
            path: fullEndpoint.path,
            namespace_id: fullEndpoint.namespaceId,
            api_key_id: fullEndpoint.apiKeyId || null,
            enabled: fullEndpoint.enabled ? 1 : 0,
            created_at: fullEndpoint.createdAt,
            updated_at: fullEndpoint.updatedAt
        });

        this.emit('endpoint:created', fullEndpoint);
        return fullEndpoint;
    }

    getEndpointByPath(path: string): Endpoint | null {
        const stmt = this.db.prepare('SELECT * FROM endpoints WHERE path = ?');
        const row = stmt.get(path) as Record<string, unknown> | undefined;
        if (!row) return null;
        return fromDbRow<Endpoint>(row, []);
    }

    getAllEndpoints(): Endpoint[] {
        const stmt = this.db.prepare('SELECT * FROM endpoints ORDER BY path ASC');
        const rows = stmt.all() as Record<string, unknown>[];
        return rows.map(row => fromDbRow<Endpoint>(row, []));
    }

    deleteEndpoint(id: string): boolean {
        const stmt = this.db.prepare('DELETE FROM endpoints WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    // ============================================
    // API Keys
    // ============================================

    createApiKey(name: string, scopes: string[] = ['read']): { apiKey: ApiKey; plainKey: string } {
        const plainKey = `aios_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');
        const keyPrefix = plainKey.substring(0, 12);

        const apiKey: ApiKey = {
            id: generateId(),
            name,
            keyHash,
            keyPrefix,
            scopes,
            createdAt: Date.now()
        };

        const stmt = this.db.prepare(`
            INSERT INTO api_keys (id, name, key_hash, key_prefix, scopes, expires_at, last_used_at, created_at)
            VALUES (@id, @name, @key_hash, @key_prefix, @scopes, @expires_at, @last_used_at, @created_at)
        `);

        stmt.run({
            id: apiKey.id,
            name: apiKey.name,
            key_hash: apiKey.keyHash,
            key_prefix: apiKey.keyPrefix,
            scopes: JSON.stringify(apiKey.scopes),
            expires_at: apiKey.expiresAt || null,
            last_used_at: apiKey.lastUsedAt || null,
            created_at: apiKey.createdAt
        });

        return { apiKey, plainKey };
    }

    validateApiKey(plainKey: string): ApiKey | null {
        const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');
        const stmt = this.db.prepare('SELECT * FROM api_keys WHERE key_hash = ?');
        const row = stmt.get(keyHash) as Record<string, unknown> | undefined;
        
        if (!row) return null;
        
        const apiKey = fromDbRow<ApiKey>(row, ['scopes']);
        
        // Check expiration
        if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
            return null;
        }

        // Update last used
        const updateStmt = this.db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?');
        updateStmt.run(Date.now(), apiKey.id);

        return apiKey;
    }

    getAllApiKeys(): ApiKey[] {
        const stmt = this.db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC');
        const rows = stmt.all() as Record<string, unknown>[];
        return rows.map(row => fromDbRow<ApiKey>(row, ['scopes']));
    }

    deleteApiKey(id: string): boolean {
        const stmt = this.db.prepare('DELETE FROM api_keys WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    // ============================================
    // Policies
    // ============================================

    createPolicy(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Policy {
        const now = Date.now();
        const fullPolicy: Policy = {
            id: generateId(),
            ...policy,
            createdAt: now,
            updatedAt: now
        };

        const stmt = this.db.prepare(`
            INSERT INTO policies (id, name, description, priority, rules, enabled, created_at, updated_at)
            VALUES (@id, @name, @description, @priority, @rules, @enabled, @created_at, @updated_at)
        `);

        stmt.run({
            id: fullPolicy.id,
            name: fullPolicy.name,
            description: fullPolicy.description || null,
            priority: fullPolicy.priority,
            rules: JSON.stringify(fullPolicy.rules),
            enabled: fullPolicy.enabled ? 1 : 0,
            created_at: fullPolicy.createdAt,
            updated_at: fullPolicy.updatedAt
        });

        this.emit('policy:created', fullPolicy);
        return fullPolicy;
    }

    getAllPolicies(): Policy[] {
        const stmt = this.db.prepare('SELECT * FROM policies WHERE enabled = 1 ORDER BY priority ASC');
        const rows = stmt.all() as Record<string, unknown>[];
        return rows.map(row => fromDbRow<Policy>(row, ['rules']));
    }

    evaluatePolicy(toolName: string, serverName?: string): { allowed: boolean; matchedRule?: PolicyRule } {
        const policies = this.getAllPolicies();
        
        for (const policy of policies) {
            for (const rule of policy.rules) {
                const pattern = rule.pattern.replace(/\*/g, '.*');
                const regex = new RegExp(`^${pattern}$`, 'i');
                
                const target = serverName ? `${serverName}/${toolName}` : toolName;
                if (regex.test(target) || regex.test(toolName)) {
                    return {
                        allowed: rule.action === 'allow',
                        matchedRule: rule
                    };
                }
            }
        }

        // Default: allow if no policy matches
        return { allowed: true };
    }

    deletePolicy(id: string): boolean {
        const stmt = this.db.prepare('DELETE FROM policies WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    // ============================================
    // Tool Call Logs
    // ============================================

    logToolCall(log: Omit<ToolCallLog, 'id'>): ToolCallLog {
        const fullLog: ToolCallLog = {
            id: generateId(),
            ...log
        };

        const stmt = this.db.prepare(`
            INSERT INTO tool_call_logs (id, timestamp, tool_name, mcp_server_id, namespace_id, endpoint_id, api_key_id, request_args, response_data, error_message, duration_ms, success)
            VALUES (@id, @timestamp, @tool_name, @mcp_server_id, @namespace_id, @endpoint_id, @api_key_id, @request_args, @response_data, @error_message, @duration_ms, @success)
        `);

        stmt.run({
            id: fullLog.id,
            timestamp: fullLog.timestamp,
            tool_name: fullLog.toolName,
            mcp_server_id: fullLog.mcpServerId || null,
            namespace_id: fullLog.namespaceId || null,
            endpoint_id: fullLog.endpointId || null,
            api_key_id: fullLog.apiKeyId || null,
            request_args: fullLog.requestArgs ? JSON.stringify(fullLog.requestArgs) : null,
            response_data: fullLog.responseData ? JSON.stringify(fullLog.responseData) : null,
            error_message: fullLog.errorMessage || null,
            duration_ms: fullLog.durationMs,
            success: fullLog.success ? 1 : 0
        });

        this.emit('toolcall:logged', fullLog);
        return fullLog;
    }

    getToolCallLogs(filter?: {
        toolName?: string;
        mcpServerId?: string;
        success?: boolean;
        limit?: number;
        since?: number;
    }): ToolCallLog[] {
        let query = 'SELECT * FROM tool_call_logs WHERE 1=1';
        const params: unknown[] = [];

        if (filter?.toolName) {
            query += ' AND tool_name = ?';
            params.push(filter.toolName);
        }
        if (filter?.mcpServerId) {
            query += ' AND mcp_server_id = ?';
            params.push(filter.mcpServerId);
        }
        if (filter?.success !== undefined) {
            query += ' AND success = ?';
            params.push(filter.success ? 1 : 0);
        }
        if (filter?.since) {
            query += ' AND timestamp >= ?';
            params.push(filter.since);
        }

        query += ' ORDER BY timestamp DESC';

        if (filter?.limit) {
            query += ' LIMIT ?';
            params.push(filter.limit);
        }

        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as Record<string, unknown>[];
        return rows.map(row => fromDbRow<ToolCallLog>(row, ['requestArgs', 'responseData']));
    }

    // ============================================
    // Saved Scripts
    // ============================================

    createSavedScript(script: Omit<SavedScript, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>): SavedScript {
        const now = Date.now();
        const fullScript: SavedScript = {
            id: generateId(),
            ...script,
            runCount: 0,
            createdAt: now,
            updatedAt: now
        };

        const stmt = this.db.prepare(`
            INSERT INTO saved_scripts (id, name, description, language, code, tags, is_favorite, run_count, last_run_at, created_at, updated_at)
            VALUES (@id, @name, @description, @language, @code, @tags, @is_favorite, @run_count, @last_run_at, @created_at, @updated_at)
        `);

        stmt.run({
            id: fullScript.id,
            name: fullScript.name,
            description: fullScript.description || null,
            language: fullScript.language,
            code: fullScript.code,
            tags: fullScript.tags ? JSON.stringify(fullScript.tags) : null,
            is_favorite: fullScript.isFavorite ? 1 : 0,
            run_count: fullScript.runCount,
            last_run_at: fullScript.lastRunAt || null,
            created_at: fullScript.createdAt,
            updated_at: fullScript.updatedAt
        });

        return fullScript;
    }

    getAllSavedScripts(): SavedScript[] {
        const stmt = this.db.prepare('SELECT * FROM saved_scripts ORDER BY is_favorite DESC, updated_at DESC');
        const rows = stmt.all() as Record<string, unknown>[];
        return rows.map(row => fromDbRow<SavedScript>(row, ['tags']));
    }

    incrementScriptRunCount(id: string): void {
        const now = Date.now();
        const stmt = this.db.prepare('UPDATE saved_scripts SET run_count = run_count + 1, last_run_at = ?, updated_at = ? WHERE id = ?');
        stmt.run(now, now, id);
    }

    deleteSavedScript(id: string): boolean {
        const stmt = this.db.prepare('DELETE FROM saved_scripts WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    // ============================================
    // Tool Sets
    // ============================================

    createToolSet(toolSet: Omit<ToolSet, 'id' | 'createdAt' | 'updatedAt'>): ToolSet {
        const now = Date.now();
        const fullToolSet: ToolSet = {
            id: generateId(),
            ...toolSet,
            createdAt: now,
            updatedAt: now
        };

        const stmt = this.db.prepare(`
            INSERT INTO tool_sets (id, name, description, tool_ids, icon, is_public, created_at, updated_at)
            VALUES (@id, @name, @description, @tool_ids, @icon, @is_public, @created_at, @updated_at)
        `);

        stmt.run({
            id: fullToolSet.id,
            name: fullToolSet.name,
            description: fullToolSet.description || null,
            tool_ids: JSON.stringify(fullToolSet.toolIds),
            icon: fullToolSet.icon || null,
            is_public: fullToolSet.isPublic ? 1 : 0,
            created_at: fullToolSet.createdAt,
            updated_at: fullToolSet.updatedAt
        });

        return fullToolSet;
    }

    getAllToolSets(): ToolSet[] {
        const stmt = this.db.prepare('SELECT * FROM tool_sets ORDER BY name ASC');
        const rows = stmt.all() as Record<string, unknown>[];
        return rows.map(row => fromDbRow<ToolSet>(row, ['toolIds']));
    }

    deleteToolSet(id: string): boolean {
        const stmt = this.db.prepare('DELETE FROM tool_sets WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    // ============================================
    // Utility
    // ============================================

    close(): void {
        try {
            this.db.close();
            DatabaseManager.instance = null;
            console.log('[DatabaseManager] Closed');
        } catch (e) {
            console.error('[DatabaseManager] Failed to close:', e);
        }
    }

    getStats(): {
        servers: number;
        tools: number;
        namespaces: number;
        endpoints: number;
        apiKeys: number;
        policies: number;
        toolCallLogs: number;
        savedScripts: number;
        toolSets: number;
    } {
        const counts = this.db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM mcp_servers) as servers,
                (SELECT COUNT(*) FROM tools) as tools,
                (SELECT COUNT(*) FROM namespaces) as namespaces,
                (SELECT COUNT(*) FROM endpoints) as endpoints,
                (SELECT COUNT(*) FROM api_keys) as api_keys,
                (SELECT COUNT(*) FROM policies) as policies,
                (SELECT COUNT(*) FROM tool_call_logs) as tool_call_logs,
                (SELECT COUNT(*) FROM saved_scripts) as saved_scripts,
                (SELECT COUNT(*) FROM tool_sets) as tool_sets
        `).get() as Record<string, number>;

        return {
            servers: counts.servers,
            tools: counts.tools,
            namespaces: counts.namespaces,
            endpoints: counts.endpoints,
            apiKeys: counts.api_keys,
            policies: counts.policies,
            toolCallLogs: counts.tool_call_logs,
            savedScripts: counts.saved_scripts,
            toolSets: counts.tool_sets
        };
    }
}

// Re-export types
export * from './schema.js';
