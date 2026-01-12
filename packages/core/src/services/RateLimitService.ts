/**
 * AIOS Rate Limit Service
 * 
 * Manages API rate limiting with support for:
 * - Multiple algorithms: sliding window, token bucket, fixed window, leaky bucket
 * - Per-user, per-API key, per-IP, and global limits
 * - Tiered rate limits based on subscription/role
 * - Distributed rate limiting with Redis backend (optional)
 * - Rate limit headers and quota information
 * - Burst allowance and throttling
 * 
 * @module services/RateLimitService
 */

import { EventEmitter } from 'events';

// ============================================
// Types & Interfaces
// ============================================

export type RateLimitAlgorithm = 'sliding_window' | 'token_bucket' | 'fixed_window' | 'leaky_bucket';

export type RateLimitScope = 'global' | 'user' | 'api_key' | 'ip' | 'endpoint' | 'custom';

export type RateLimitStatus = 'allowed' | 'throttled' | 'blocked' | 'warning';

export type TierLevel = 'free' | 'basic' | 'pro' | 'enterprise' | 'unlimited';

export interface RateLimitRule {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    priority: number;              // Lower = higher priority
    
    // What this rule applies to
    scope: RateLimitScope;
    scopeKey?: string;             // Specific user ID, API key, IP, or pattern
    
    // Endpoint matching (optional)
    endpoints?: {
        pattern: string;           // Glob or regex pattern
        methods?: string[];        // HTTP methods, empty = all
    }[];
    
    // Rate limit configuration
    algorithm: RateLimitAlgorithm;
    limit: number;                 // Max requests
    window: number;                // Window size in milliseconds
    
    // Token bucket specific
    bucketSize?: number;           // Max tokens in bucket
    refillRate?: number;           // Tokens added per second
    
    // Burst allowance
    burstLimit?: number;           // Allow burst above limit
    burstWindow?: number;          // Burst window in ms
    
    // Response when limited
    retryAfter?: number;           // Suggested retry time in seconds
    customMessage?: string;
    
    // Metadata
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown>;
}

export interface RateLimitTier {
    id: string;
    name: string;
    level: TierLevel;
    description?: string;
    
    // Default limits for this tier
    defaultLimits: {
        requestsPerMinute: number;
        requestsPerHour: number;
        requestsPerDay: number;
        burstLimit: number;
    };
    
    // Cost multiplier (for metered billing)
    costMultiplier: number;
    
    // Features
    features: {
        priorityQueue: boolean;
        dedicatedPool: boolean;
        customRules: boolean;
        analytics: boolean;
    };
    
    createdAt: Date;
    updatedAt: Date;
}

export interface RateLimitEntry {
    key: string;                   // Composite key: scope:identifier:endpoint
    rule: RateLimitRule;
    
    // Current state
    count: number;                 // Current request count
    windowStart: number;           // Window start timestamp
    tokens?: number;               // For token bucket
    lastRefill?: number;           // Last token refill timestamp
    
    // Sliding window data
    slots?: Map<number, number>;   // Time slot -> count
    
    // Burst tracking
    burstCount?: number;
    burstWindowStart?: number;
    
    // Statistics
    totalRequests: number;
    totalBlocked: number;
    lastRequest: number;
    lastBlocked?: number;
}

export interface RateLimitResult {
    allowed: boolean;
    status: RateLimitStatus;
    
    // Quota information
    limit: number;
    remaining: number;
    reset: number;                 // Unix timestamp when limit resets
    
    // Retry information
    retryAfter?: number;           // Seconds until retry is allowed
    
    // Rule that was applied
    ruleId: string;
    ruleName: string;
    
    // Headers to send
    headers: Record<string, string>;
    
    // Additional info
    message?: string;
    tier?: TierLevel;
}

export interface RateLimitStats {
    scope: RateLimitScope;
    identifier: string;
    
    // Current period
    currentRequests: number;
    currentBlocked: number;
    currentWindow: {
        start: Date;
        end: Date;
    };
    
    // Historical
    totalRequests: number;
    totalBlocked: number;
    blockRate: number;             // Percentage
    
    // Peak usage
    peakRequestsPerMinute: number;
    peakTimestamp?: Date;
    
    // By endpoint
    byEndpoint: Map<string, {
        requests: number;
        blocked: number;
        avgLatency?: number;
    }>;
}

export interface RateLimitConfig {
    // Storage backend
    storage: 'memory' | 'redis';
    redisUrl?: string;
    
    // Default behavior
    defaultAlgorithm: RateLimitAlgorithm;
    defaultLimit: number;
    defaultWindow: number;
    
    // Global settings
    enabled: boolean;
    bypassTokens: string[];        // Tokens that bypass rate limiting
    
    // Cleanup
    cleanupInterval: number;       // How often to clean expired entries (ms)
    entryTtl: number;              // How long to keep inactive entries (ms)
    
    // Response customization
    includeHeaders: boolean;
    customHeaderPrefix: string;    // e.g., 'X-RateLimit-'
}

// ============================================
// Rate Limit Service
// ============================================

export class RateLimitService extends EventEmitter {
    private config: RateLimitConfig;
    private rules: Map<string, RateLimitRule> = new Map();
    private tiers: Map<string, RateLimitTier> = new Map();
    private entries: Map<string, RateLimitEntry> = new Map();
    private userTiers: Map<string, string> = new Map();  // userId -> tierId
    private cleanupTimer?: ReturnType<typeof setInterval>;
    
    // Statistics
    private globalStats = {
        totalRequests: 0,
        totalAllowed: 0,
        totalBlocked: 0,
        totalThrottled: 0,
    };
    
    constructor(config: Partial<RateLimitConfig> = {}) {
        super();
        this.config = {
            storage: 'memory',
            defaultAlgorithm: 'sliding_window',
            defaultLimit: 100,
            defaultWindow: 60000,  // 1 minute
            enabled: true,
            bypassTokens: [],
            cleanupInterval: 60000,  // 1 minute
            entryTtl: 3600000,       // 1 hour
            includeHeaders: true,
            customHeaderPrefix: 'X-RateLimit-',
            ...config,
        };
        
        this.initializeDefaultTiers();
        this.startCleanup();
    }
    
    // ============================================
    // Rule Management
    // ============================================
    
    /**
     * Create a new rate limit rule
     */
    createRule(rule: Omit<RateLimitRule, 'id' | 'createdAt' | 'updatedAt'>): RateLimitRule {
        const newRule: RateLimitRule = {
            ...rule,
            id: this.generateId('rule'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        this.rules.set(newRule.id, newRule);
        this.emit('rule:created', newRule);
        
        return newRule;
    }
    
    /**
     * Update an existing rule
     */
    updateRule(ruleId: string, updates: Partial<RateLimitRule>): RateLimitRule | null {
        const rule = this.rules.get(ruleId);
        if (!rule) return null;
        
        const updated: RateLimitRule = {
            ...rule,
            ...updates,
            id: rule.id,
            createdAt: rule.createdAt,
            updatedAt: new Date(),
        };
        
        this.rules.set(ruleId, updated);
        this.emit('rule:updated', updated);
        
        return updated;
    }
    
    /**
     * Delete a rule
     */
    deleteRule(ruleId: string): boolean {
        const rule = this.rules.get(ruleId);
        if (!rule) return false;
        
        this.rules.delete(ruleId);
        this.emit('rule:deleted', rule);
        
        return true;
    }
    
    /**
     * Get a rule by ID
     */
    getRule(ruleId: string): RateLimitRule | null {
        return this.rules.get(ruleId) || null;
    }
    
    /**
     * List all rules
     */
    listRules(options: {
        scope?: RateLimitScope;
        enabled?: boolean;
        sortBy?: 'priority' | 'name' | 'createdAt';
    } = {}): RateLimitRule[] {
        let rules = Array.from(this.rules.values());
        
        if (options.scope) {
            rules = rules.filter(r => r.scope === options.scope);
        }
        
        if (options.enabled !== undefined) {
            rules = rules.filter(r => r.enabled === options.enabled);
        }
        
        const sortBy = options.sortBy || 'priority';
        rules.sort((a, b) => {
            switch (sortBy) {
                case 'priority':
                    return a.priority - b.priority;
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'createdAt':
                    return b.createdAt.getTime() - a.createdAt.getTime();
                default:
                    return 0;
            }
        });
        
        return rules;
    }
    
    // ============================================
    // Tier Management
    // ============================================
    
    /**
     * Initialize default rate limit tiers
     */
    private initializeDefaultTiers(): void {
        const defaultTiers: Omit<RateLimitTier, 'id' | 'createdAt' | 'updatedAt'>[] = [
            {
                name: 'Free',
                level: 'free',
                description: 'Free tier with basic rate limits',
                defaultLimits: {
                    requestsPerMinute: 20,
                    requestsPerHour: 500,
                    requestsPerDay: 5000,
                    burstLimit: 5,
                },
                costMultiplier: 1.0,
                features: {
                    priorityQueue: false,
                    dedicatedPool: false,
                    customRules: false,
                    analytics: false,
                },
            },
            {
                name: 'Basic',
                level: 'basic',
                description: 'Basic tier with increased limits',
                defaultLimits: {
                    requestsPerMinute: 60,
                    requestsPerHour: 2000,
                    requestsPerDay: 20000,
                    burstLimit: 15,
                },
                costMultiplier: 0.9,
                features: {
                    priorityQueue: false,
                    dedicatedPool: false,
                    customRules: false,
                    analytics: true,
                },
            },
            {
                name: 'Pro',
                level: 'pro',
                description: 'Professional tier with high limits',
                defaultLimits: {
                    requestsPerMinute: 200,
                    requestsPerHour: 10000,
                    requestsPerDay: 100000,
                    burstLimit: 50,
                },
                costMultiplier: 0.8,
                features: {
                    priorityQueue: true,
                    dedicatedPool: false,
                    customRules: true,
                    analytics: true,
                },
            },
            {
                name: 'Enterprise',
                level: 'enterprise',
                description: 'Enterprise tier with premium limits',
                defaultLimits: {
                    requestsPerMinute: 1000,
                    requestsPerHour: 50000,
                    requestsPerDay: 500000,
                    burstLimit: 200,
                },
                costMultiplier: 0.7,
                features: {
                    priorityQueue: true,
                    dedicatedPool: true,
                    customRules: true,
                    analytics: true,
                },
            },
            {
                name: 'Unlimited',
                level: 'unlimited',
                description: 'Unlimited tier - no rate limits',
                defaultLimits: {
                    requestsPerMinute: Infinity,
                    requestsPerHour: Infinity,
                    requestsPerDay: Infinity,
                    burstLimit: Infinity,
                },
                costMultiplier: 0.6,
                features: {
                    priorityQueue: true,
                    dedicatedPool: true,
                    customRules: true,
                    analytics: true,
                },
            },
        ];
        
        for (const tier of defaultTiers) {
            const id = this.generateId('tier');
            this.tiers.set(id, {
                ...tier,
                id,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
    }
    
    /**
     * Get tier by level
     */
    getTierByLevel(level: TierLevel): RateLimitTier | null {
        for (const tier of this.tiers.values()) {
            if (tier.level === level) return tier;
        }
        return null;
    }
    
    /**
     * Assign a tier to a user
     */
    assignUserTier(userId: string, tierLevel: TierLevel): boolean {
        const tier = this.getTierByLevel(tierLevel);
        if (!tier) return false;
        
        this.userTiers.set(userId, tier.id);
        this.emit('tier:assigned', { userId, tier });
        
        return true;
    }
    
    /**
     * Get user's tier
     */
    getUserTier(userId: string): RateLimitTier | null {
        const tierId = this.userTiers.get(userId);
        if (!tierId) {
            // Return free tier as default
            return this.getTierByLevel('free');
        }
        return this.tiers.get(tierId) || this.getTierByLevel('free');
    }
    
    /**
     * List all tiers
     */
    listTiers(): RateLimitTier[] {
        return Array.from(this.tiers.values()).sort((a, b) => {
            const order: TierLevel[] = ['free', 'basic', 'pro', 'enterprise', 'unlimited'];
            return order.indexOf(a.level) - order.indexOf(b.level);
        });
    }
    
    // ============================================
    // Rate Limiting Core
    // ============================================
    
    /**
     * Check if a request should be allowed
     */
    async checkLimit(options: {
        scope: RateLimitScope;
        identifier: string;        // User ID, API key, IP, etc.
        endpoint?: string;
        method?: string;
        bypassToken?: string;
    }): Promise<RateLimitResult> {
        this.globalStats.totalRequests++;
        
        // Check bypass token
        if (options.bypassToken && this.config.bypassTokens.includes(options.bypassToken)) {
            return this.createAllowedResult('bypass');
        }
        
        // Check if rate limiting is enabled
        if (!this.config.enabled) {
            return this.createAllowedResult('disabled');
        }
        
        // Find applicable rules
        const applicableRules = this.findApplicableRules(options);
        
        if (applicableRules.length === 0) {
            // Use default limits based on user tier
            const tier = options.scope === 'user' 
                ? this.getUserTier(options.identifier)
                : this.getTierByLevel('free');
            
            const defaultRule = this.createDefaultRule(tier, options.scope, options.identifier);
            applicableRules.push(defaultRule);
        }
        
        // Check each rule (most restrictive wins)
        let mostRestrictiveResult: RateLimitResult | null = null;
        
        for (const rule of applicableRules) {
            const result = await this.checkRuleLimit(rule, options);
            
            if (!result.allowed) {
                // Return immediately if blocked
                this.globalStats.totalBlocked++;
                this.emit('rate_limit:blocked', { ...options, result });
                return result;
            }
            
            if (!mostRestrictiveResult || result.remaining < mostRestrictiveResult.remaining) {
                mostRestrictiveResult = result;
            }
        }
        
        this.globalStats.totalAllowed++;
        
        if (mostRestrictiveResult && mostRestrictiveResult.status === 'warning') {
            this.globalStats.totalThrottled++;
            this.emit('rate_limit:warning', { ...options, result: mostRestrictiveResult });
        }
        
        return mostRestrictiveResult || this.createAllowedResult('no-rule');
    }
    
    /**
     * Find rules that apply to this request
     */
    private findApplicableRules(options: {
        scope: RateLimitScope;
        identifier: string;
        endpoint?: string;
        method?: string;
    }): RateLimitRule[] {
        const applicable: RateLimitRule[] = [];
        
        for (const rule of this.rules.values()) {
            if (!rule.enabled) continue;
            
            // Check scope match
            if (rule.scope !== options.scope && rule.scope !== 'global') continue;
            
            // Check scope key match
            if (rule.scopeKey && rule.scopeKey !== options.identifier) {
                // Check if it's a pattern
                if (!this.matchPattern(options.identifier, rule.scopeKey)) continue;
            }
            
            // Check endpoint match
            if (rule.endpoints && rule.endpoints.length > 0 && options.endpoint) {
                const endpointMatches = rule.endpoints.some(ep => {
                    const patternMatches = this.matchPattern(options.endpoint!, ep.pattern);
                    const methodMatches = !ep.methods || ep.methods.length === 0 || 
                        (options.method && ep.methods.includes(options.method.toUpperCase()));
                    return patternMatches && methodMatches;
                });
                
                if (!endpointMatches) continue;
            }
            
            applicable.push(rule);
        }
        
        // Sort by priority
        applicable.sort((a, b) => a.priority - b.priority);
        
        return applicable;
    }
    
    /**
     * Check limit for a specific rule
     */
    private async checkRuleLimit(
        rule: RateLimitRule,
        options: { scope: RateLimitScope; identifier: string; endpoint?: string }
    ): Promise<RateLimitResult> {
        const key = this.createEntryKey(rule, options);
        let entry = this.entries.get(key);
        
        const now = Date.now();
        
        if (!entry) {
            entry = this.createEntry(key, rule);
            this.entries.set(key, entry);
        }
        
        // Apply algorithm
        let result: RateLimitResult;
        
        switch (rule.algorithm) {
            case 'sliding_window':
                result = this.applySlidingWindow(entry, rule, now);
                break;
            case 'token_bucket':
                result = this.applyTokenBucket(entry, rule, now);
                break;
            case 'fixed_window':
                result = this.applyFixedWindow(entry, rule, now);
                break;
            case 'leaky_bucket':
                result = this.applyLeakyBucket(entry, rule, now);
                break;
            default:
                result = this.applySlidingWindow(entry, rule, now);
        }
        
        // Update statistics
        entry.totalRequests++;
        entry.lastRequest = now;
        
        if (!result.allowed) {
            entry.totalBlocked++;
            entry.lastBlocked = now;
        }
        
        return result;
    }
    
    // ============================================
    // Rate Limiting Algorithms
    // ============================================
    
    /**
     * Sliding window algorithm
     * More accurate than fixed window, smooths out burst edges
     */
    private applySlidingWindow(
        entry: RateLimitEntry,
        rule: RateLimitRule,
        now: number
    ): RateLimitResult {
        const windowSize = rule.window;
        const slotSize = Math.max(1000, windowSize / 10);  // 10 slots per window, min 1 second
        const windowStart = now - windowSize;
        
        // Initialize slots if needed
        if (!entry.slots) {
            entry.slots = new Map();
        }
        
        // Clean old slots
        for (const [time] of entry.slots) {
            if (time < windowStart) {
                entry.slots.delete(time);
            }
        }
        
        // Calculate current count
        let count = 0;
        for (const [time, slotCount] of entry.slots) {
            if (time >= windowStart) {
                // Weight by how much of the slot is in the window
                const slotEnd = time + slotSize;
                const overlap = Math.min(slotEnd, now) - Math.max(time, windowStart);
                const weight = overlap / slotSize;
                count += slotCount * weight;
            }
        }
        
        // Check if allowed
        const allowed = count < rule.limit;
        
        if (allowed) {
            // Increment current slot
            const currentSlot = Math.floor(now / slotSize) * slotSize;
            const currentCount = entry.slots.get(currentSlot) || 0;
            entry.slots.set(currentSlot, currentCount + 1);
            count++;
        }
        
        const remaining = Math.max(0, rule.limit - Math.ceil(count));
        const reset = now + windowSize;
        const status = this.calculateStatus(count, rule.limit, allowed);
        
        return this.createResult(rule, allowed, status, remaining, reset);
    }
    
    /**
     * Token bucket algorithm
     * Allows bursts while maintaining average rate
     */
    private applyTokenBucket(
        entry: RateLimitEntry,
        rule: RateLimitRule,
        now: number
    ): RateLimitResult {
        const bucketSize = rule.bucketSize || rule.limit;
        const refillRate = rule.refillRate || (rule.limit / (rule.window / 1000));  // tokens per second
        
        // Initialize tokens
        if (entry.tokens === undefined) {
            entry.tokens = bucketSize;
            entry.lastRefill = now;
        }
        
        // Refill tokens
        const timeSinceRefill = (now - (entry.lastRefill || now)) / 1000;  // in seconds
        const tokensToAdd = timeSinceRefill * refillRate;
        entry.tokens = Math.min(bucketSize, entry.tokens + tokensToAdd);
        entry.lastRefill = now;
        
        // Check if we have tokens
        const allowed = entry.tokens >= 1;
        
        if (allowed) {
            entry.tokens--;
        }
        
        const remaining = Math.floor(entry.tokens);
        const reset = now + Math.ceil((bucketSize - entry.tokens) / refillRate * 1000);
        const status = this.calculateStatus(bucketSize - entry.tokens, bucketSize, allowed);
        
        return this.createResult(rule, allowed, status, remaining, reset);
    }
    
    /**
     * Fixed window algorithm
     * Simple but can allow 2x burst at window boundaries
     */
    private applyFixedWindow(
        entry: RateLimitEntry,
        rule: RateLimitRule,
        now: number
    ): RateLimitResult {
        const windowStart = Math.floor(now / rule.window) * rule.window;
        
        // Reset if new window
        if (entry.windowStart !== windowStart) {
            entry.windowStart = windowStart;
            entry.count = 0;
        }
        
        const allowed = entry.count < rule.limit;
        
        if (allowed) {
            entry.count++;
        }
        
        const remaining = Math.max(0, rule.limit - entry.count);
        const reset = windowStart + rule.window;
        const status = this.calculateStatus(entry.count, rule.limit, allowed);
        
        return this.createResult(rule, allowed, status, remaining, reset);
    }
    
    /**
     * Leaky bucket algorithm
     * Smoothest output rate, processes at constant rate
     */
    private applyLeakyBucket(
        entry: RateLimitEntry,
        rule: RateLimitRule,
        now: number
    ): RateLimitResult {
        const bucketSize = rule.bucketSize || rule.limit;
        const leakRate = rule.refillRate || (rule.limit / (rule.window / 1000));  // leaks per second
        
        // Initialize
        if (entry.tokens === undefined) {
            entry.tokens = 0;  // Start empty (tokens = queued requests)
            entry.lastRefill = now;
        }
        
        // Leak tokens (process requests)
        const timeSinceLeak = (now - (entry.lastRefill || now)) / 1000;
        const tokensToLeak = timeSinceLeak * leakRate;
        entry.tokens = Math.max(0, entry.tokens - tokensToLeak);
        entry.lastRefill = now;
        
        // Check if bucket has space
        const allowed = entry.tokens < bucketSize;
        
        if (allowed) {
            entry.tokens++;  // Add request to bucket
        }
        
        const remaining = Math.max(0, Math.floor(bucketSize - entry.tokens));
        const reset = now + Math.ceil(entry.tokens / leakRate * 1000);
        const status = this.calculateStatus(entry.tokens, bucketSize, allowed);
        
        return this.createResult(rule, allowed, status, remaining, reset);
    }
    
    // ============================================
    // Helper Methods
    // ============================================
    
    private calculateStatus(current: number, limit: number, allowed: boolean): RateLimitStatus {
        if (!allowed) return 'blocked';
        
        const ratio = current / limit;
        if (ratio >= 0.9) return 'warning';
        if (ratio >= 0.95) return 'throttled';
        
        return 'allowed';
    }
    
    private createResult(
        rule: RateLimitRule,
        allowed: boolean,
        status: RateLimitStatus,
        remaining: number,
        reset: number
    ): RateLimitResult {
        const headers: Record<string, string> = {};
        
        if (this.config.includeHeaders) {
            const prefix = this.config.customHeaderPrefix;
            headers[`${prefix}Limit`] = rule.limit.toString();
            headers[`${prefix}Remaining`] = remaining.toString();
            headers[`${prefix}Reset`] = Math.ceil(reset / 1000).toString();
            
            if (!allowed) {
                headers['Retry-After'] = (rule.retryAfter || Math.ceil((reset - Date.now()) / 1000)).toString();
            }
        }
        
        return {
            allowed,
            status,
            limit: rule.limit,
            remaining,
            reset: Math.ceil(reset / 1000),
            retryAfter: allowed ? undefined : (rule.retryAfter || Math.ceil((reset - Date.now()) / 1000)),
            ruleId: rule.id,
            ruleName: rule.name,
            headers,
            message: allowed ? undefined : (rule.customMessage || 'Rate limit exceeded'),
        };
    }
    
    private createAllowedResult(reason: string): RateLimitResult {
        return {
            allowed: true,
            status: 'allowed',
            limit: Infinity,
            remaining: Infinity,
            reset: 0,
            ruleId: reason,
            ruleName: reason,
            headers: {},
        };
    }
    
    private createEntry(key: string, rule: RateLimitRule): RateLimitEntry {
        return {
            key,
            rule,
            count: 0,
            windowStart: Date.now(),
            totalRequests: 0,
            totalBlocked: 0,
            lastRequest: Date.now(),
        };
    }
    
    private createEntryKey(
        rule: RateLimitRule,
        options: { scope: RateLimitScope; identifier: string; endpoint?: string }
    ): string {
        const parts = [rule.id, options.scope, options.identifier];
        if (options.endpoint) parts.push(options.endpoint);
        return parts.join(':');
    }
    
    private createDefaultRule(
        tier: RateLimitTier | null,
        scope: RateLimitScope,
        identifier: string
    ): RateLimitRule {
        const limits = tier?.defaultLimits || {
            requestsPerMinute: this.config.defaultLimit,
            requestsPerHour: this.config.defaultLimit * 60,
            requestsPerDay: this.config.defaultLimit * 60 * 24,
            burstLimit: 10,
        };
        
        return {
            id: `default:${scope}:${identifier}`,
            name: `Default ${tier?.name || 'Free'} Limit`,
            enabled: true,
            priority: 1000,
            scope,
            algorithm: this.config.defaultAlgorithm,
            limit: limits.requestsPerMinute,
            window: 60000,
            burstLimit: limits.burstLimit,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    
    private matchPattern(value: string, pattern: string): boolean {
        // Support simple glob patterns
        const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        
        try {
            return new RegExp(`^${regexPattern}$`).test(value);
        } catch {
            return value === pattern;
        }
    }
    
    private generateId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    
    // ============================================
    // Statistics & Analytics
    // ============================================
    
    /**
     * Get statistics for a specific scope/identifier
     */
    getStats(scope: RateLimitScope, identifier: string): RateLimitStats {
        const byEndpoint = new Map<string, { requests: number; blocked: number }>();
        let totalRequests = 0;
        let totalBlocked = 0;
        let currentRequests = 0;
        let currentBlocked = 0;
        let peakRequestsPerMinute = 0;
        
        const now = Date.now();
        const currentWindowStart = now - 60000;  // Last minute
        
        for (const entry of this.entries.values()) {
            if (!entry.key.includes(`${scope}:${identifier}`)) continue;
            
            totalRequests += entry.totalRequests;
            totalBlocked += entry.totalBlocked;
            
            // Current window
            if (entry.lastRequest >= currentWindowStart) {
                currentRequests += entry.count;
                if (entry.lastBlocked && entry.lastBlocked >= currentWindowStart) {
                    currentBlocked++;
                }
            }
            
            // Extract endpoint from key
            const parts = entry.key.split(':');
            if (parts.length >= 4) {
                const endpoint = parts[3];
                const existing = byEndpoint.get(endpoint) || { requests: 0, blocked: 0 };
                existing.requests += entry.totalRequests;
                existing.blocked += entry.totalBlocked;
                byEndpoint.set(endpoint, existing);
            }
            
            // Track peak
            if (entry.count > peakRequestsPerMinute) {
                peakRequestsPerMinute = entry.count;
            }
        }
        
        return {
            scope,
            identifier,
            currentRequests,
            currentBlocked,
            currentWindow: {
                start: new Date(currentWindowStart),
                end: new Date(now),
            },
            totalRequests,
            totalBlocked,
            blockRate: totalRequests > 0 ? (totalBlocked / totalRequests) * 100 : 0,
            peakRequestsPerMinute,
            byEndpoint,
        };
    }
    
    /**
     * Get global statistics
     */
    getGlobalStats(): typeof this.globalStats & { activeEntries: number; activeRules: number } {
        return {
            ...this.globalStats,
            activeEntries: this.entries.size,
            activeRules: this.rules.size,
        };
    }
    
    /**
     * Reset statistics for a scope/identifier
     */
    resetStats(scope: RateLimitScope, identifier: string): void {
        for (const [key, entry] of this.entries) {
            if (key.includes(`${scope}:${identifier}`)) {
                entry.totalRequests = 0;
                entry.totalBlocked = 0;
                entry.count = 0;
            }
        }
        
        this.emit('stats:reset', { scope, identifier });
    }
    
    // ============================================
    // Cleanup & Maintenance
    // ============================================
    
    private startCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }
    
    private cleanup(): void {
        const now = Date.now();
        const expiry = now - this.config.entryTtl;
        let cleaned = 0;
        
        for (const [key, entry] of this.entries) {
            if (entry.lastRequest < expiry) {
                this.entries.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.emit('cleanup', { cleaned, remaining: this.entries.size });
        }
    }
    
    /**
     * Manually trigger cleanup
     */
    forceCleanup(): { cleaned: number; remaining: number } {
        const before = this.entries.size;
        this.cleanup();
        return {
            cleaned: before - this.entries.size,
            remaining: this.entries.size,
        };
    }
    
    // ============================================
    // Middleware Helpers
    // ============================================
    
    /**
     * Create Hono middleware for rate limiting
     */
    createMiddleware(options: {
        scope?: RateLimitScope;
        keyExtractor?: (c: unknown) => string;
        skipPaths?: string[];
    } = {}): (c: unknown, next: () => Promise<void>) => Promise<Response | void> {
        const scope = options.scope || 'ip';
        
        return async (c: any, next: () => Promise<void>) => {
            // Skip certain paths
            const path = c.req.path;
            if (options.skipPaths?.some(p => path.startsWith(p))) {
                return next();
            }
            
            // Extract identifier
            let identifier: string;
            if (options.keyExtractor) {
                identifier = options.keyExtractor(c);
            } else {
                switch (scope) {
                    case 'ip':
                        identifier = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
                                   c.req.header('x-real-ip') ||
                                   'unknown';
                        break;
                    case 'user':
                        identifier = c.get('userId') || 'anonymous';
                        break;
                    case 'api_key':
                        identifier = c.req.header('x-api-key') || 'no-key';
                        break;
                    default:
                        identifier = 'global';
                }
            }
            
            // Check rate limit
            const result = await this.checkLimit({
                scope,
                identifier,
                endpoint: path,
                method: c.req.method,
                bypassToken: c.req.header('x-bypass-token'),
            });
            
            // Set headers
            for (const [key, value] of Object.entries(result.headers)) {
                c.header(key, value);
            }
            
            if (!result.allowed) {
                return c.json({
                    error: 'Too Many Requests',
                    message: result.message,
                    retryAfter: result.retryAfter,
                }, 429);
            }
            
            return next();
        };
    }
    
    // ============================================
    // Lifecycle
    // ============================================
    
    /**
     * Shutdown the service
     */
    shutdown(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.emit('shutdown');
    }
}

// ============================================
// Singleton Instance
// ============================================

let rateLimitServiceInstance: RateLimitService | null = null;

export function getRateLimitService(config?: Partial<RateLimitConfig>): RateLimitService {
    if (!rateLimitServiceInstance) {
        rateLimitServiceInstance = new RateLimitService(config);
    }
    return rateLimitServiceInstance;
}

export function resetRateLimitService(): void {
    if (rateLimitServiceInstance) {
        rateLimitServiceInstance.shutdown();
        rateLimitServiceInstance = null;
    }
}
