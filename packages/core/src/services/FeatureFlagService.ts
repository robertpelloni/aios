/**
 * @module services/FeatureFlagService
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export type FlagType = 'boolean' | 'string' | 'number' | 'json';

export type RolloutStrategy = 'all' | 'percentage' | 'user_ids' | 'user_attributes' | 'gradual';

export interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description?: string;
    type: FlagType;
    defaultValue: unknown;
    enabled: boolean;
    
    rules: FlagRule[];
    
    environments: Record<string, EnvironmentConfig>;
    
    tags?: string[];
    metadata?: Record<string, unknown>;
    
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

export interface EnvironmentConfig {
    enabled: boolean;
    rules?: FlagRule[];
    defaultValue?: unknown;
}

export interface FlagRule {
    id: string;
    name?: string;
    priority: number;
    conditions: RuleCondition[];
    rollout: RolloutConfig;
    value: unknown;
    enabled: boolean;
}

export interface RuleCondition {
    attribute: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'regex' | 'exists';
    value: unknown;
}

export interface RolloutConfig {
    strategy: RolloutStrategy;
    percentage?: number;
    userIds?: string[];
    gradualConfig?: {
        startPercentage: number;
        endPercentage: number;
        startDate: Date;
        endDate: Date;
    };
}

export interface EvaluationContext {
    userId?: string;
    sessionId?: string;
    environment?: string;
    attributes?: Record<string, unknown>;
}

export interface EvaluationResult<T = unknown> {
    flagKey: string;
    value: T;
    enabled: boolean;
    ruleId?: string;
    reason: 'default' | 'rule_match' | 'disabled' | 'not_found' | 'error';
    metadata?: Record<string, unknown>;
}

export interface FlagStats {
    flagKey: string;
    evaluations: number;
    enabledCount: number;
    disabledCount: number;
    byRule: Map<string, number>;
    byEnvironment: Map<string, number>;
    lastEvaluated?: Date;
}

export interface FeatureFlagConfig {
    defaultEnvironment: string;
    cacheEnabled: boolean;
    cacheTtlMs: number;
    trackEvaluations: boolean;
}

const DEFAULT_CONFIG: FeatureFlagConfig = {
    defaultEnvironment: 'production',
    cacheEnabled: true,
    cacheTtlMs: 60000,
    trackEvaluations: true,
};

export class FeatureFlagService extends EventEmitter {
    private config: FeatureFlagConfig;
    private flags: Map<string, FeatureFlag> = new Map();
    private flagsByKey: Map<string, string> = new Map();
    private stats: Map<string, FlagStats> = new Map();
    private evaluationCache: Map<string, { value: EvaluationResult; expiresAt: number }> = new Map();

    constructor(config: Partial<FeatureFlagConfig> = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    createFlag(params: {
        key: string;
        name: string;
        type: FlagType;
        defaultValue: unknown;
        description?: string;
        enabled?: boolean;
        rules?: FlagRule[];
        environments?: Record<string, EnvironmentConfig>;
        tags?: string[];
        metadata?: Record<string, unknown>;
        createdBy: string;
    }): FeatureFlag {
        if (this.flagsByKey.has(params.key)) {
            throw new Error(`Flag with key '${params.key}' already exists`);
        }

        const flag: FeatureFlag = {
            id: this.generateId(),
            key: params.key,
            name: params.name,
            description: params.description,
            type: params.type,
            defaultValue: params.defaultValue,
            enabled: params.enabled ?? false,
            rules: params.rules || [],
            environments: params.environments || {},
            tags: params.tags,
            metadata: params.metadata,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: params.createdBy,
        };

        this.flags.set(flag.id, flag);
        this.flagsByKey.set(flag.key, flag.id);
        this.initStats(flag.key);

        this.emit('flag:created', flag);
        return flag;
    }

    updateFlag(flagId: string, updates: Partial<Omit<FeatureFlag, 'id' | 'key' | 'createdAt' | 'createdBy'>>): FeatureFlag | null {
        const flag = this.flags.get(flagId);
        if (!flag) return null;

        Object.assign(flag, updates, { updatedAt: new Date() });
        this.invalidateCache(flag.key);

        this.emit('flag:updated', flag);
        return flag;
    }

    deleteFlag(flagId: string): boolean {
        const flag = this.flags.get(flagId);
        if (!flag) return false;

        this.flags.delete(flagId);
        this.flagsByKey.delete(flag.key);
        this.stats.delete(flag.key);
        this.invalidateCache(flag.key);

        this.emit('flag:deleted', { flagId, key: flag.key });
        return true;
    }

    getFlag(flagId: string): FeatureFlag | null {
        return this.flags.get(flagId) || null;
    }

    getFlagByKey(key: string): FeatureFlag | null {
        const id = this.flagsByKey.get(key);
        if (!id) return null;
        return this.flags.get(id) || null;
    }

    listFlags(options: {
        enabled?: boolean;
        tags?: string[];
        environment?: string;
        search?: string;
    } = {}): FeatureFlag[] {
        let flags = Array.from(this.flags.values());

        if (options.enabled !== undefined) {
            flags = flags.filter(f => f.enabled === options.enabled);
        }
        if (options.tags?.length) {
            flags = flags.filter(f => options.tags!.some(t => f.tags?.includes(t)));
        }
        if (options.environment) {
            flags = flags.filter(f => f.environments[options.environment!] !== undefined);
        }
        if (options.search) {
            const search = options.search.toLowerCase();
            flags = flags.filter(f =>
                f.key.toLowerCase().includes(search) ||
                f.name.toLowerCase().includes(search) ||
                f.description?.toLowerCase().includes(search)
            );
        }

        return flags;
    }

    evaluate<T = unknown>(key: string, context: EvaluationContext = {}): EvaluationResult<T> {
        const cacheKey = this.buildCacheKey(key, context);

        if (this.config.cacheEnabled) {
            const cached = this.evaluationCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.value as EvaluationResult<T>;
            }
        }

        const flag = this.getFlagByKey(key);

        if (!flag) {
            return this.createResult<T>(key, undefined as T, false, undefined, 'not_found');
        }

        if (!flag.enabled) {
            return this.createResult<T>(key, flag.defaultValue as T, false, undefined, 'disabled');
        }

        const env = context.environment || this.config.defaultEnvironment;
        const envConfig = flag.environments[env];

        if (envConfig && !envConfig.enabled) {
            const value = envConfig.defaultValue ?? flag.defaultValue;
            return this.createResult<T>(key, value as T, false, undefined, 'disabled');
        }

        const rules = envConfig?.rules || flag.rules;
        const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

        for (const rule of sortedRules) {
            if (!rule.enabled) continue;

            const conditionsMatch = this.evaluateConditions(rule.conditions, context);
            if (!conditionsMatch) continue;

            const rolloutMatch = this.evaluateRollout(rule.rollout, context);
            if (!rolloutMatch) continue;

            const result = this.createResult<T>(key, rule.value as T, true, rule.id, 'rule_match');
            this.cacheResult(cacheKey, result);
            this.trackEvaluation(key, env, rule.id, true);
            return result;
        }

        const defaultValue = envConfig?.defaultValue ?? flag.defaultValue;
        const result = this.createResult<T>(key, defaultValue as T, true, undefined, 'default');
        this.cacheResult(cacheKey, result);
        this.trackEvaluation(key, env, undefined, true);
        return result;
    }

    evaluateAll(context: EvaluationContext = {}): Map<string, EvaluationResult> {
        const results = new Map<string, EvaluationResult>();

        for (const flag of this.flags.values()) {
            results.set(flag.key, this.evaluate(flag.key, context));
        }

        return results;
    }

    isEnabled(key: string, context: EvaluationContext = {}): boolean {
        const result = this.evaluate<boolean>(key, context);
        return result.enabled && result.value === true;
    }

    getValue<T>(key: string, defaultValue: T, context: EvaluationContext = {}): T {
        const result = this.evaluate<T>(key, context);
        return result.value ?? defaultValue;
    }

    addRule(flagId: string, rule: Omit<FlagRule, 'id'>): FlagRule | null {
        const flag = this.flags.get(flagId);
        if (!flag) return null;

        const newRule: FlagRule = {
            ...rule,
            id: this.generateId(),
        };

        flag.rules.push(newRule);
        flag.updatedAt = new Date();
        this.invalidateCache(flag.key);

        this.emit('rule:added', { flagId, rule: newRule });
        return newRule;
    }

    updateRule(flagId: string, ruleId: string, updates: Partial<Omit<FlagRule, 'id'>>): FlagRule | null {
        const flag = this.flags.get(flagId);
        if (!flag) return null;

        const rule = flag.rules.find(r => r.id === ruleId);
        if (!rule) return null;

        Object.assign(rule, updates);
        flag.updatedAt = new Date();
        this.invalidateCache(flag.key);

        this.emit('rule:updated', { flagId, rule });
        return rule;
    }

    deleteRule(flagId: string, ruleId: string): boolean {
        const flag = this.flags.get(flagId);
        if (!flag) return false;

        const index = flag.rules.findIndex(r => r.id === ruleId);
        if (index === -1) return false;

        flag.rules.splice(index, 1);
        flag.updatedAt = new Date();
        this.invalidateCache(flag.key);

        this.emit('rule:deleted', { flagId, ruleId });
        return true;
    }

    setEnvironmentConfig(flagId: string, environment: string, config: EnvironmentConfig): boolean {
        const flag = this.flags.get(flagId);
        if (!flag) return false;

        flag.environments[environment] = config;
        flag.updatedAt = new Date();
        this.invalidateCache(flag.key);

        this.emit('environment:configured', { flagId, environment, config });
        return true;
    }

    toggleFlag(flagId: string, enabled: boolean): boolean {
        const flag = this.flags.get(flagId);
        if (!flag) return false;

        flag.enabled = enabled;
        flag.updatedAt = new Date();
        this.invalidateCache(flag.key);

        this.emit('flag:toggled', { flagId, key: flag.key, enabled });
        return true;
    }

    toggleEnvironment(flagId: string, environment: string, enabled: boolean): boolean {
        const flag = this.flags.get(flagId);
        if (!flag) return false;

        if (!flag.environments[environment]) {
            flag.environments[environment] = { enabled };
        } else {
            flag.environments[environment].enabled = enabled;
        }

        flag.updatedAt = new Date();
        this.invalidateCache(flag.key);

        this.emit('environment:toggled', { flagId, environment, enabled });
        return true;
    }

    getStats(key: string): FlagStats | null {
        return this.stats.get(key) || null;
    }

    getAllStats(): Map<string, FlagStats> {
        return new Map(this.stats);
    }

    private evaluateConditions(conditions: RuleCondition[], context: EvaluationContext): boolean {
        if (conditions.length === 0) return true;

        return conditions.every(condition => {
            const value = this.getAttributeValue(condition.attribute, context);
            return this.evaluateCondition(condition, value);
        });
    }

    private getAttributeValue(attribute: string, context: EvaluationContext): unknown {
        if (attribute === 'userId') return context.userId;
        if (attribute === 'sessionId') return context.sessionId;
        if (attribute === 'environment') return context.environment;
        return context.attributes?.[attribute];
    }

    private evaluateCondition(condition: RuleCondition, value: unknown): boolean {
        const { operator, value: conditionValue } = condition;

        switch (operator) {
            case 'eq': return value === conditionValue;
            case 'neq': return value !== conditionValue;
            case 'gt': return typeof value === 'number' && typeof conditionValue === 'number' && value > conditionValue;
            case 'gte': return typeof value === 'number' && typeof conditionValue === 'number' && value >= conditionValue;
            case 'lt': return typeof value === 'number' && typeof conditionValue === 'number' && value < conditionValue;
            case 'lte': return typeof value === 'number' && typeof conditionValue === 'number' && value <= conditionValue;
            case 'contains': return typeof value === 'string' && typeof conditionValue === 'string' && value.includes(conditionValue);
            case 'not_contains': return typeof value === 'string' && typeof conditionValue === 'string' && !value.includes(conditionValue);
            case 'in': return Array.isArray(conditionValue) && conditionValue.includes(value);
            case 'not_in': return Array.isArray(conditionValue) && !conditionValue.includes(value);
            case 'regex': return typeof value === 'string' && typeof conditionValue === 'string' && new RegExp(conditionValue).test(value);
            case 'exists': return value !== undefined && value !== null;
            default: return false;
        }
    }

    private evaluateRollout(rollout: RolloutConfig, context: EvaluationContext): boolean {
        switch (rollout.strategy) {
            case 'all':
                return true;

            case 'percentage':
                if (!rollout.percentage) return false;
                const hash = this.hashContext(context);
                return hash < rollout.percentage;

            case 'user_ids':
                return !!context.userId && !!rollout.userIds?.includes(context.userId);

            case 'user_attributes':
                return true;

            case 'gradual':
                if (!rollout.gradualConfig) return false;
                const { startPercentage, endPercentage, startDate, endDate } = rollout.gradualConfig;
                const now = Date.now();
                const start = new Date(startDate).getTime();
                const end = new Date(endDate).getTime();

                if (now < start) return this.hashContext(context) < startPercentage;
                if (now > end) return this.hashContext(context) < endPercentage;

                const progress = (now - start) / (end - start);
                const currentPercentage = startPercentage + (endPercentage - startPercentage) * progress;
                return this.hashContext(context) < currentPercentage;

            default:
                return false;
        }
    }

    private hashContext(context: EvaluationContext): number {
        const key = context.userId || context.sessionId || crypto.randomUUID();
        const hash = crypto.createHash('md5').update(key).digest('hex');
        const num = parseInt(hash.substring(0, 8), 16);
        return (num % 100);
    }

    private createResult<T>(
        flagKey: string,
        value: T,
        enabled: boolean,
        ruleId: string | undefined,
        reason: EvaluationResult['reason']
    ): EvaluationResult<T> {
        return { flagKey, value, enabled, ruleId, reason };
    }

    private buildCacheKey(key: string, context: EvaluationContext): string {
        return `${key}:${context.userId || ''}:${context.environment || ''}:${JSON.stringify(context.attributes || {})}`;
    }

    private cacheResult(cacheKey: string, result: EvaluationResult): void {
        if (!this.config.cacheEnabled) return;

        this.evaluationCache.set(cacheKey, {
            value: result,
            expiresAt: Date.now() + this.config.cacheTtlMs,
        });
    }

    private invalidateCache(flagKey: string): void {
        for (const [key] of this.evaluationCache) {
            if (key.startsWith(flagKey + ':')) {
                this.evaluationCache.delete(key);
            }
        }
    }

    private initStats(flagKey: string): void {
        this.stats.set(flagKey, {
            flagKey,
            evaluations: 0,
            enabledCount: 0,
            disabledCount: 0,
            byRule: new Map(),
            byEnvironment: new Map(),
        });
    }

    private trackEvaluation(flagKey: string, environment: string, ruleId: string | undefined, enabled: boolean): void {
        if (!this.config.trackEvaluations) return;

        const stats = this.stats.get(flagKey);
        if (!stats) return;

        stats.evaluations++;
        stats.lastEvaluated = new Date();

        if (enabled) {
            stats.enabledCount++;
        } else {
            stats.disabledCount++;
        }

        if (ruleId) {
            stats.byRule.set(ruleId, (stats.byRule.get(ruleId) || 0) + 1);
        }

        stats.byEnvironment.set(environment, (stats.byEnvironment.get(environment) || 0) + 1);
    }

    private generateId(): string {
        return `flag_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    clearCache(): void {
        this.evaluationCache.clear();
        this.emit('cache:cleared');
    }

    shutdown(): void {
        this.emit('shutdown');
    }
}

let featureFlagServiceInstance: FeatureFlagService | null = null;

export function getFeatureFlagService(config?: Partial<FeatureFlagConfig>): FeatureFlagService {
    if (!featureFlagServiceInstance) {
        featureFlagServiceInstance = new FeatureFlagService(config);
    }
    return featureFlagServiceInstance;
}

export function resetFeatureFlagService(): void {
    if (featureFlagServiceInstance) {
        featureFlagServiceInstance.shutdown();
        featureFlagServiceInstance = null;
    }
}
