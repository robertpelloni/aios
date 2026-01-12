/**
 * AIOS Rate Limit Routes (Hono)
 * 
 * API endpoints for rate limit management, rules, tiers, and statistics.
 * 
 * @module routes/rateLimitRoutesHono
 */

import { Hono } from 'hono';
import { 
    getRateLimitService, 
    type RateLimitScope, 
    type RateLimitAlgorithm,
    type TierLevel,
} from '../services/RateLimitService.js';

export function createRateLimitRoutes(): Hono {
    const app = new Hono();
    const service = getRateLimitService();

    // ============================================
    // Rule Management
    // ============================================

    app.post('/rules', async (c) => {
        try {
            const body = await c.req.json();
            
            const rule = service.createRule({
                name: body.name,
                description: body.description,
                enabled: body.enabled ?? true,
                priority: body.priority ?? 100,
                scope: body.scope as RateLimitScope,
                scopeKey: body.scopeKey,
                endpoints: body.endpoints,
                algorithm: body.algorithm as RateLimitAlgorithm || 'sliding_window',
                limit: body.limit,
                window: body.window,
                bucketSize: body.bucketSize,
                refillRate: body.refillRate,
                burstLimit: body.burstLimit,
                burstWindow: body.burstWindow,
                retryAfter: body.retryAfter,
                customMessage: body.customMessage,
                metadata: body.metadata,
            });
            
            return c.json({ success: true, rule }, 201);
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to create rule' 
            }, 400);
        }
    });

    app.get('/rules', async (c) => {
        try {
            const scope = c.req.query('scope') as RateLimitScope | undefined;
            const enabled = c.req.query('enabled');
            const sortBy = c.req.query('sortBy') as 'priority' | 'name' | 'createdAt' | undefined;
            
            const rules = service.listRules({
                scope,
                enabled: enabled !== undefined ? enabled === 'true' : undefined,
                sortBy,
            });
            
            return c.json({ success: true, rules, count: rules.length });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to list rules' 
            }, 500);
        }
    });

    app.get('/rules/:ruleId', async (c) => {
        try {
            const ruleId = c.req.param('ruleId');
            const rule = service.getRule(ruleId);
            
            if (!rule) {
                return c.json({ success: false, error: 'Rule not found' }, 404);
            }
            
            return c.json({ success: true, rule });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to get rule' 
            }, 500);
        }
    });

    app.patch('/rules/:ruleId', async (c) => {
        try {
            const ruleId = c.req.param('ruleId');
            const body = await c.req.json();
            
            const rule = service.updateRule(ruleId, body);
            
            if (!rule) {
                return c.json({ success: false, error: 'Rule not found' }, 404);
            }
            
            return c.json({ success: true, rule });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to update rule' 
            }, 400);
        }
    });

    app.delete('/rules/:ruleId', async (c) => {
        try {
            const ruleId = c.req.param('ruleId');
            const deleted = service.deleteRule(ruleId);
            
            if (!deleted) {
                return c.json({ success: false, error: 'Rule not found' }, 404);
            }
            
            return c.json({ success: true, message: 'Rule deleted' });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to delete rule' 
            }, 500);
        }
    });

    app.post('/rules/:ruleId/enable', async (c) => {
        try {
            const ruleId = c.req.param('ruleId');
            const rule = service.updateRule(ruleId, { enabled: true });
            
            if (!rule) {
                return c.json({ success: false, error: 'Rule not found' }, 404);
            }
            
            return c.json({ success: true, rule });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to enable rule' 
            }, 500);
        }
    });

    app.post('/rules/:ruleId/disable', async (c) => {
        try {
            const ruleId = c.req.param('ruleId');
            const rule = service.updateRule(ruleId, { enabled: false });
            
            if (!rule) {
                return c.json({ success: false, error: 'Rule not found' }, 404);
            }
            
            return c.json({ success: true, rule });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to disable rule' 
            }, 500);
        }
    });

    // ============================================
    // Tier Management
    // ============================================

    app.get('/tiers', async (c) => {
        try {
            const tiers = service.listTiers();
            return c.json({ success: true, tiers, count: tiers.length });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to list tiers' 
            }, 500);
        }
    });

    app.get('/tiers/:level', async (c) => {
        try {
            const level = c.req.param('level') as TierLevel;
            const tier = service.getTierByLevel(level);
            
            if (!tier) {
                return c.json({ success: false, error: 'Tier not found' }, 404);
            }
            
            return c.json({ success: true, tier });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to get tier' 
            }, 500);
        }
    });

    app.post('/users/:userId/tier', async (c) => {
        try {
            const userId = c.req.param('userId');
            const body = await c.req.json();
            
            if (!body.tierLevel) {
                return c.json({ success: false, error: 'tierLevel is required' }, 400);
            }
            
            const success = service.assignUserTier(userId, body.tierLevel as TierLevel);
            
            if (!success) {
                return c.json({ success: false, error: 'Invalid tier level' }, 400);
            }
            
            const tier = service.getUserTier(userId);
            return c.json({ success: true, userId, tier });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to assign tier' 
            }, 500);
        }
    });

    app.get('/users/:userId/tier', async (c) => {
        try {
            const userId = c.req.param('userId');
            const tier = service.getUserTier(userId);
            
            return c.json({ success: true, userId, tier });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to get user tier' 
            }, 500);
        }
    });

    // ============================================
    // Rate Limit Checking
    // ============================================

    app.post('/check', async (c) => {
        try {
            const body = await c.req.json();
            
            if (!body.scope || !body.identifier) {
                return c.json({ 
                    success: false, 
                    error: 'scope and identifier are required' 
                }, 400);
            }
            
            const result = await service.checkLimit({
                scope: body.scope as RateLimitScope,
                identifier: body.identifier,
                endpoint: body.endpoint,
                method: body.method,
                bypassToken: body.bypassToken,
            });
            
            return c.json({ success: true, result });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to check limit' 
            }, 500);
        }
    });

    app.get('/check/:scope/:identifier', async (c) => {
        try {
            const scope = c.req.param('scope') as RateLimitScope;
            const identifier = c.req.param('identifier');
            const endpoint = c.req.query('endpoint');
            const method = c.req.query('method');
            
            const result = await service.checkLimit({
                scope,
                identifier,
                endpoint,
                method,
            });
            
            return c.json({ success: true, result });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to check limit' 
            }, 500);
        }
    });

    // ============================================
    // Statistics
    // ============================================

    app.get('/stats', async (c) => {
        try {
            const stats = service.getGlobalStats();
            return c.json({ success: true, stats });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to get stats' 
            }, 500);
        }
    });

    app.get('/stats/:scope/:identifier', async (c) => {
        try {
            const scope = c.req.param('scope') as RateLimitScope;
            const identifier = c.req.param('identifier');
            
            const stats = service.getStats(scope, identifier);
            
            return c.json({ 
                success: true, 
                stats: {
                    ...stats,
                    byEndpoint: Object.fromEntries(stats.byEndpoint),
                }
            });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to get stats' 
            }, 500);
        }
    });

    app.post('/stats/:scope/:identifier/reset', async (c) => {
        try {
            const scope = c.req.param('scope') as RateLimitScope;
            const identifier = c.req.param('identifier');
            
            service.resetStats(scope, identifier);
            
            return c.json({ success: true, message: 'Stats reset' });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to reset stats' 
            }, 500);
        }
    });

    // ============================================
    // Maintenance
    // ============================================

    app.post('/cleanup', async (c) => {
        try {
            const result = service.forceCleanup();
            return c.json({ success: true, ...result });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to run cleanup' 
            }, 500);
        }
    });

    // ============================================
    // Bulk Operations
    // ============================================

    app.post('/rules/bulk', async (c) => {
        try {
            const body = await c.req.json();
            
            if (!Array.isArray(body.rules)) {
                return c.json({ success: false, error: 'rules array is required' }, 400);
            }
            
            const created = [];
            const errors = [];
            
            for (const ruleData of body.rules) {
                try {
                    const rule = service.createRule({
                        name: ruleData.name,
                        description: ruleData.description,
                        enabled: ruleData.enabled ?? true,
                        priority: ruleData.priority ?? 100,
                        scope: ruleData.scope as RateLimitScope,
                        scopeKey: ruleData.scopeKey,
                        endpoints: ruleData.endpoints,
                        algorithm: ruleData.algorithm as RateLimitAlgorithm || 'sliding_window',
                        limit: ruleData.limit,
                        window: ruleData.window,
                        bucketSize: ruleData.bucketSize,
                        refillRate: ruleData.refillRate,
                        burstLimit: ruleData.burstLimit,
                        burstWindow: ruleData.burstWindow,
                        retryAfter: ruleData.retryAfter,
                        customMessage: ruleData.customMessage,
                        metadata: ruleData.metadata,
                    });
                    created.push(rule);
                } catch (err) {
                    errors.push({ 
                        rule: ruleData.name, 
                        error: err instanceof Error ? err.message : 'Unknown error' 
                    });
                }
            }
            
            return c.json({ 
                success: true, 
                created: created.length,
                errors: errors.length,
                rules: created,
                errorDetails: errors.length > 0 ? errors : undefined,
            }, created.length > 0 ? 201 : 400);
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to create rules' 
            }, 400);
        }
    });

    app.delete('/rules/bulk', async (c) => {
        try {
            const body = await c.req.json();
            
            if (!Array.isArray(body.ruleIds)) {
                return c.json({ success: false, error: 'ruleIds array is required' }, 400);
            }
            
            let deleted = 0;
            const notFound = [];
            
            for (const ruleId of body.ruleIds) {
                if (service.deleteRule(ruleId)) {
                    deleted++;
                } else {
                    notFound.push(ruleId);
                }
            }
            
            return c.json({ 
                success: true, 
                deleted,
                notFound: notFound.length > 0 ? notFound : undefined,
            });
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to delete rules' 
            }, 500);
        }
    });

    // ============================================
    // Presets
    // ============================================

    app.get('/presets', async (c) => {
        const presets = [
            {
                name: 'api-standard',
                description: 'Standard API rate limiting',
                rules: [
                    { scope: 'ip', algorithm: 'sliding_window', limit: 100, window: 60000 },
                    { scope: 'user', algorithm: 'sliding_window', limit: 1000, window: 3600000 },
                ]
            },
            {
                name: 'api-strict',
                description: 'Strict API rate limiting for sensitive endpoints',
                rules: [
                    { scope: 'ip', algorithm: 'sliding_window', limit: 20, window: 60000 },
                    { scope: 'user', algorithm: 'token_bucket', limit: 100, window: 60000, bucketSize: 10 },
                ]
            },
            {
                name: 'auth-protection',
                description: 'Protection for authentication endpoints',
                rules: [
                    { scope: 'ip', algorithm: 'fixed_window', limit: 5, window: 300000, endpoints: [{ pattern: '/auth/*' }] },
                    { scope: 'ip', algorithm: 'fixed_window', limit: 3, window: 900000, endpoints: [{ pattern: '/auth/login' }] },
                ]
            },
            {
                name: 'webhook-ingest',
                description: 'Rate limiting for webhook ingestion',
                rules: [
                    { scope: 'api_key', algorithm: 'leaky_bucket', limit: 1000, window: 60000, refillRate: 20 },
                ]
            },
        ];
        
        return c.json({ success: true, presets });
    });

    app.post('/presets/:presetName/apply', async (c) => {
        try {
            const presetName = c.req.param('presetName');
            const body = await c.req.json();
            
            const presets: Record<string, Array<{
                scope: RateLimitScope;
                algorithm: RateLimitAlgorithm;
                limit: number;
                window: number;
                bucketSize?: number;
                refillRate?: number;
                endpoints?: Array<{ pattern: string }>;
            }>> = {
                'api-standard': [
                    { scope: 'ip', algorithm: 'sliding_window', limit: 100, window: 60000 },
                    { scope: 'user', algorithm: 'sliding_window', limit: 1000, window: 3600000 },
                ],
                'api-strict': [
                    { scope: 'ip', algorithm: 'sliding_window', limit: 20, window: 60000 },
                    { scope: 'user', algorithm: 'token_bucket', limit: 100, window: 60000, bucketSize: 10 },
                ],
                'auth-protection': [
                    { scope: 'ip', algorithm: 'fixed_window', limit: 5, window: 300000, endpoints: [{ pattern: '/auth/*' }] },
                    { scope: 'ip', algorithm: 'fixed_window', limit: 3, window: 900000, endpoints: [{ pattern: '/auth/login' }] },
                ],
                'webhook-ingest': [
                    { scope: 'api_key', algorithm: 'leaky_bucket', limit: 1000, window: 60000, refillRate: 20 },
                ],
            };
            
            const presetRules = presets[presetName];
            if (!presetRules) {
                return c.json({ success: false, error: 'Preset not found' }, 404);
            }
            
            const created = [];
            for (const ruleConfig of presetRules) {
                const rule = service.createRule({
                    name: `${presetName}-${ruleConfig.scope}`,
                    description: body.description || `Auto-created from preset: ${presetName}`,
                    enabled: true,
                    priority: body.priority ?? 50,
                    ...ruleConfig,
                });
                created.push(rule);
            }
            
            return c.json({ success: true, preset: presetName, rules: created }, 201);
        } catch (error) {
            return c.json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to apply preset' 
            }, 500);
        }
    });

    // ============================================
    // Health & Info
    // ============================================

    app.get('/health', async (c) => {
        const stats = service.getGlobalStats();
        return c.json({
            success: true,
            status: 'healthy',
            activeRules: stats.activeRules,
            activeEntries: stats.activeEntries,
            totalRequests: stats.totalRequests,
        });
    });

    app.get('/info', async (c) => {
        return c.json({
            success: true,
            algorithms: ['sliding_window', 'token_bucket', 'fixed_window', 'leaky_bucket'],
            scopes: ['global', 'user', 'api_key', 'ip', 'endpoint', 'custom'],
            tiers: ['free', 'basic', 'pro', 'enterprise', 'unlimited'],
            features: {
                slidingWindow: 'More accurate than fixed window, smooths burst edges',
                tokenBucket: 'Allows bursts while maintaining average rate',
                fixedWindow: 'Simple counter reset at window boundaries',
                leakyBucket: 'Smoothest output rate, constant processing',
            },
        });
    });

    return app;
}
