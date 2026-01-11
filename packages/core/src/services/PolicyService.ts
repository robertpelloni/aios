/**
 * AIOS Policy Service - Access Control for MCP Tools
 * 
 * Features migrated from MetaMCP:
 * - Allow/deny rules with glob patterns
 * - Priority-based policy evaluation
 * - Time-based access control
 * - Rate limiting per policy
 * - API key requirement enforcement
 * - Namespace-scoped policies
 */

import { EventEmitter } from 'events';
import { DatabaseManager, Policy, PolicyRule, PolicyAction } from '../db/index.js';

// ============================================
// Types
// ============================================

export interface PolicyEvaluationResult {
    allowed: boolean;
    matchedPolicy?: Policy;
    matchedRule?: PolicyRule;
    reason?: string;
    rateLimitRemaining?: number;
}

export interface PolicyContext {
    toolName: string;
    serverName?: string;
    namespaceId?: string;
    endpointPath?: string;
    apiKeyId?: string;
    userId?: string;
    timestamp?: number;
}

export interface RateLimitState {
    count: number;
    windowStart: number;
}

export interface PolicyTemplate {
    name: string;
    description: string;
    rules: PolicyRule[];
}

// ============================================
// PolicyService Class
// ============================================

export class PolicyService extends EventEmitter {
    private db: DatabaseManager;
    private rateLimitCache: Map<string, RateLimitState> = new Map();
    private policyCache: Policy[] | null = null;
    private policyCacheExpiry: number = 0;
    private readonly CACHE_TTL_MS = 30000;

    constructor(dataDir?: string) {
        super();
        this.db = DatabaseManager.getInstance(dataDir);
    }

    // ============================================
    // Policy Evaluation
    // ============================================

    evaluate(context: PolicyContext): PolicyEvaluationResult {
        const policies = this.getPoliciesCached();
        const now = context.timestamp ?? Date.now();

        for (const policy of policies) {
            if (!policy.enabled) continue;

            for (const rule of policy.rules) {
                if (this.matchesRule(context, rule)) {
                    const rateCheck = this.checkRateLimit(context, rule, now);
                    if (!rateCheck.allowed) {
                        return {
                            allowed: false,
                            matchedPolicy: policy,
                            matchedRule: rule,
                            reason: rateCheck.reason,
                            rateLimitRemaining: 0
                        };
                    }

                    const timeCheck = this.checkTimeRange(rule, now);
                    if (!timeCheck.allowed) {
                        return {
                            allowed: false,
                            matchedPolicy: policy,
                            matchedRule: rule,
                            reason: timeCheck.reason
                        };
                    }

                    const apiKeyCheck = this.checkApiKeyRequirement(context, rule);
                    if (!apiKeyCheck.allowed) {
                        return {
                            allowed: false,
                            matchedPolicy: policy,
                            matchedRule: rule,
                            reason: apiKeyCheck.reason
                        };
                    }

                    if (rule.action === 'deny') {
                        this.emit('policy:denied', { context, policy, rule });
                        return {
                            allowed: false,
                            matchedPolicy: policy,
                            matchedRule: rule,
                            reason: `Denied by policy: ${policy.name}`,
                            rateLimitRemaining: rateCheck.remaining
                        };
                    }

                    this.emit('policy:allowed', { context, policy, rule });
                    return {
                        allowed: true,
                        matchedPolicy: policy,
                        matchedRule: rule,
                        rateLimitRemaining: rateCheck.remaining
                    };
                }
            }
        }

        return { allowed: true, reason: 'No matching policy (default allow)' };
    }

    async evaluateAsync(context: PolicyContext): Promise<PolicyEvaluationResult> {
        return this.evaluate(context);
    }

    // ============================================
    // Rule Matching
    // ============================================

    private matchesRule(context: PolicyContext, rule: PolicyRule): boolean {
        const pattern = rule.pattern;

        if (pattern === '*') return true;

        const regex = this.patternToRegex(pattern);

        if (context.serverName) {
            const fullPath = `${context.serverName}/${context.toolName}`;
            if (regex.test(fullPath)) return true;
        }

        if (regex.test(context.toolName)) return true;

        if (context.namespaceId && pattern.startsWith('namespace:')) {
            const nsPattern = pattern.substring(10);
            const nsRegex = this.patternToRegex(nsPattern);
            if (nsRegex.test(context.namespaceId)) return true;
        }

        return false;
    }

    private patternToRegex(pattern: string): RegExp {
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*\*/g, '<<<GLOBSTAR>>>')
            .replace(/\*/g, '[^/]*')
            .replace(/<<<GLOBSTAR>>>/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${escaped}$`, 'i');
    }

    // ============================================
    // Condition Checks
    // ============================================

    private checkTimeRange(rule: PolicyRule, now: number): { allowed: boolean; reason?: string } {
        if (!rule.conditions?.timeRange) {
            return { allowed: true };
        }

        const { start, end } = rule.conditions.timeRange;
        const date = new Date(now);
        const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        if (currentTime < start || currentTime > end) {
            return {
                allowed: false,
                reason: `Outside allowed time range (${start}-${end})`
            };
        }

        return { allowed: true };
    }

    private checkRateLimit(
        context: PolicyContext,
        rule: PolicyRule,
        now: number
    ): { allowed: boolean; remaining?: number; reason?: string } {
        if (!rule.conditions?.rateLimitPerMinute) {
            return { allowed: true };
        }

        const limit = rule.conditions.rateLimitPerMinute;
        const key = this.getRateLimitKey(context, rule);
        const state = this.rateLimitCache.get(key);
        const windowMs = 60000;

        if (!state || (now - state.windowStart) >= windowMs) {
            this.rateLimitCache.set(key, { count: 1, windowStart: now });
            return { allowed: true, remaining: limit - 1 };
        }

        if (state.count >= limit) {
            return {
                allowed: false,
                remaining: 0,
                reason: `Rate limit exceeded (${limit}/min)`
            };
        }

        state.count++;
        return { allowed: true, remaining: limit - state.count };
    }

    private checkApiKeyRequirement(
        context: PolicyContext,
        rule: PolicyRule
    ): { allowed: boolean; reason?: string } {
        if (!rule.conditions?.requireApiKey) {
            return { allowed: true };
        }

        if (!context.apiKeyId) {
            return {
                allowed: false,
                reason: 'API key required but not provided'
            };
        }

        return { allowed: true };
    }

    private getRateLimitKey(context: PolicyContext, rule: PolicyRule): string {
        const parts = [rule.pattern];

        if (context.apiKeyId) {
            parts.push(`key:${context.apiKeyId}`);
        } else if (context.userId) {
            parts.push(`user:${context.userId}`);
        } else if (context.endpointPath) {
            parts.push(`endpoint:${context.endpointPath}`);
        }

        return parts.join('|');
    }

    // ============================================
    // Policy Management
    // ============================================

    createPolicy(
        name: string,
        rules: PolicyRule[],
        options?: { description?: string; priority?: number; enabled?: boolean }
    ): Policy {
        const policy = this.db.createPolicy({
            name,
            description: options?.description,
            priority: options?.priority ?? 100,
            rules,
            enabled: options?.enabled ?? true
        });

        this.invalidateCache();
        this.emit('policy:created', policy);
        return policy;
    }

    deletePolicy(id: string): boolean {
        const result = this.db.deletePolicy(id);
        if (result) {
            this.invalidateCache();
            this.emit('policy:deleted', id);
        }
        return result;
    }

    getAllPolicies(): Policy[] {
        return this.db.getAllPolicies();
    }

    // ============================================
    // Policy Templates
    // ============================================

    getTemplates(): PolicyTemplate[] {
        return [
            {
                name: 'Block Dangerous Tools',
                description: 'Block tools that can execute code or access filesystem',
                rules: [
                    { action: 'deny', pattern: '**/execute*' },
                    { action: 'deny', pattern: '**/run_code*' },
                    { action: 'deny', pattern: '**/shell*' },
                    { action: 'deny', pattern: '**/filesystem/write*' },
                    { action: 'deny', pattern: '**/filesystem/delete*' }
                ]
            },
            {
                name: 'Read-Only Mode',
                description: 'Allow only read operations',
                rules: [
                    { action: 'allow', pattern: '**/read*' },
                    { action: 'allow', pattern: '**/get*' },
                    { action: 'allow', pattern: '**/list*' },
                    { action: 'allow', pattern: '**/search*' },
                    { action: 'deny', pattern: '*' }
                ]
            },
            {
                name: 'Rate Limited',
                description: 'Apply rate limiting to all tools',
                rules: [
                    {
                        action: 'allow',
                        pattern: '*',
                        conditions: { rateLimitPerMinute: 60 }
                    }
                ]
            },
            {
                name: 'Business Hours Only',
                description: 'Only allow access during business hours',
                rules: [
                    {
                        action: 'allow',
                        pattern: '*',
                        conditions: { timeRange: { start: '09:00', end: '17:00' } }
                    },
                    { action: 'deny', pattern: '*' }
                ]
            },
            {
                name: 'API Key Required',
                description: 'Require API key for all tool access',
                rules: [
                    {
                        action: 'allow',
                        pattern: '*',
                        conditions: { requireApiKey: true }
                    }
                ]
            }
        ];
    }

    applyTemplate(templateName: string, policyName?: string): Policy {
        const template = this.getTemplates().find(t => t.name === templateName);
        if (!template) {
            throw new Error(`Template not found: ${templateName}`);
        }

        return this.createPolicy(
            policyName ?? template.name,
            template.rules,
            { description: template.description }
        );
    }

    // ============================================
    // Bulk Operations
    // ============================================

    blockTools(patterns: string[], policyName = 'Blocked Tools'): Policy {
        const rules: PolicyRule[] = patterns.map(pattern => ({
            action: 'deny' as PolicyAction,
            pattern
        }));

        return this.createPolicy(policyName, rules, {
            description: `Blocks: ${patterns.join(', ')}`,
            priority: 10
        });
    }

    allowOnlyTools(patterns: string[], policyName = 'Allowed Tools'): Policy {
        const rules: PolicyRule[] = [
            ...patterns.map(pattern => ({
                action: 'allow' as PolicyAction,
                pattern
            })),
            { action: 'deny' as PolicyAction, pattern: '*' }
        ];

        return this.createPolicy(policyName, rules, {
            description: `Only allows: ${patterns.join(', ')}`,
            priority: 10
        });
    }

    setRateLimit(pattern: string, limitPerMinute: number, policyName?: string): Policy {
        return this.createPolicy(
            policyName ?? `Rate Limit: ${pattern}`,
            [{
                action: 'allow',
                pattern,
                conditions: { rateLimitPerMinute: limitPerMinute }
            }],
            { priority: 50 }
        );
    }

    // ============================================
    // Cache Management
    // ============================================

    private getPoliciesCached(): Policy[] {
        const now = Date.now();
        if (this.policyCache && now < this.policyCacheExpiry) {
            return this.policyCache;
        }

        this.policyCache = this.db.getAllPolicies();
        this.policyCacheExpiry = now + this.CACHE_TTL_MS;
        return this.policyCache;
    }

    invalidateCache(): void {
        this.policyCache = null;
        this.policyCacheExpiry = 0;
    }

    clearRateLimitCache(): void {
        this.rateLimitCache.clear();
    }

    // ============================================
    // Statistics
    // ============================================

    getStats(): {
        totalPolicies: number;
        enabledPolicies: number;
        totalRules: number;
        rateLimitEntries: number;
    } {
        const policies = this.getAllPolicies();
        const enabled = policies.filter(p => p.enabled);
        const totalRules = policies.reduce((sum, p) => sum + p.rules.length, 0);

        return {
            totalPolicies: policies.length,
            enabledPolicies: enabled.length,
            totalRules,
            rateLimitEntries: this.rateLimitCache.size
        };
    }
}
