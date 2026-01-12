/**
 * AIOS Feature Flag Routes (Hono)
 * 
 * API endpoints for feature flag management, evaluation, rules, and statistics.
 * 
 * @module routes/featureFlagRoutesHono
 */

import { Hono } from 'hono';
import {
    getFeatureFlagService,
    type FlagType,
    type RolloutStrategy,
    type EvaluationContext,
    type FlagRule,
    type RolloutConfig,
    type RuleCondition,
    type EnvironmentConfig,
} from '../services/FeatureFlagService.js';

export function createFeatureFlagRoutes(): Hono {
    const app = new Hono();
    const service = getFeatureFlagService();

    // ============================================
    // Flag Management
    // ============================================

    app.post('/flags', async (c) => {
        try {
            const body = await c.req.json();

            if (!body.key || !body.name || !body.type) {
                return c.json({
                    success: false,
                    error: 'key, name, and type are required'
                }, 400);
            }

            const flag = service.createFlag({
                key: body.key,
                name: body.name,
                type: body.type as FlagType,
                defaultValue: body.defaultValue,
                description: body.description,
                enabled: body.enabled ?? false,
                rules: body.rules,
                environments: body.environments,
                tags: body.tags,
                metadata: body.metadata,
                createdBy: body.createdBy || 'system',
            });

            return c.json({ success: true, flag }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create flag'
            }, 400);
        }
    });

    app.get('/flags', async (c) => {
        try {
            const enabled = c.req.query('enabled');
            const tags = c.req.query('tags');
            const environment = c.req.query('environment');
            const search = c.req.query('search');

            const flags = service.listFlags({
                enabled: enabled !== undefined ? enabled === 'true' : undefined,
                tags: tags ? tags.split(',') : undefined,
                environment,
                search,
            });

            return c.json({ success: true, flags, count: flags.length });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list flags'
            }, 500);
        }
    });

    app.get('/flags/:flagId', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const flag = service.getFlag(flagId);

            if (!flag) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({ success: true, flag });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get flag'
            }, 500);
        }
    });

    app.get('/flags/key/:key', async (c) => {
        try {
            const key = c.req.param('key');
            const flag = service.getFlagByKey(key);

            if (!flag) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({ success: true, flag });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get flag'
            }, 500);
        }
    });

    app.patch('/flags/:flagId', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const body = await c.req.json();

            const flag = service.updateFlag(flagId, body);

            if (!flag) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({ success: true, flag });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update flag'
            }, 400);
        }
    });

    app.delete('/flags/:flagId', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const deleted = service.deleteFlag(flagId);

            if (!deleted) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({ success: true, message: 'Flag deleted' });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete flag'
            }, 500);
        }
    });

    // ============================================
    // Flag Toggle Operations
    // ============================================

    app.post('/flags/:flagId/enable', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const success = service.toggleFlag(flagId, true);

            if (!success) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            const flag = service.getFlag(flagId);
            return c.json({ success: true, flag });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to enable flag'
            }, 500);
        }
    });

    app.post('/flags/:flagId/disable', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const success = service.toggleFlag(flagId, false);

            if (!success) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            const flag = service.getFlag(flagId);
            return c.json({ success: true, flag });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to disable flag'
            }, 500);
        }
    });

    app.post('/flags/:flagId/toggle', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const body = await c.req.json();

            if (body.enabled === undefined) {
                return c.json({ success: false, error: 'enabled is required' }, 400);
            }

            const success = service.toggleFlag(flagId, body.enabled);

            if (!success) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            const flag = service.getFlag(flagId);
            return c.json({ success: true, flag });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to toggle flag'
            }, 500);
        }
    });

    // ============================================
    // Flag Evaluation
    // ============================================

    app.post('/evaluate', async (c) => {
        try {
            const body = await c.req.json();

            if (!body.key) {
                return c.json({ success: false, error: 'key is required' }, 400);
            }

            const context: EvaluationContext = {
                userId: body.userId,
                sessionId: body.sessionId,
                environment: body.environment,
                attributes: body.attributes,
            };

            const result = service.evaluate(body.key, context);
            return c.json({ success: true, result });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to evaluate flag'
            }, 500);
        }
    });

    app.get('/evaluate/:key', async (c) => {
        try {
            const key = c.req.param('key');
            const userId = c.req.query('userId');
            const sessionId = c.req.query('sessionId');
            const environment = c.req.query('environment');

            const context: EvaluationContext = {
                userId,
                sessionId,
                environment,
            };

            const result = service.evaluate(key, context);
            return c.json({ success: true, result });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to evaluate flag'
            }, 500);
        }
    });

    app.post('/evaluate/batch', async (c) => {
        try {
            const body = await c.req.json();

            if (!Array.isArray(body.keys) || body.keys.length === 0) {
                return c.json({ success: false, error: 'keys array is required' }, 400);
            }

            const context: EvaluationContext = {
                userId: body.userId,
                sessionId: body.sessionId,
                environment: body.environment,
                attributes: body.attributes,
            };

            const results: Record<string, unknown> = {};
            for (const key of body.keys) {
                results[key] = service.evaluate(key, context);
            }

            return c.json({ success: true, results });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to evaluate flags'
            }, 500);
        }
    });

    app.post('/evaluate/all', async (c) => {
        try {
            const body = await c.req.json();

            const context: EvaluationContext = {
                userId: body.userId,
                sessionId: body.sessionId,
                environment: body.environment,
                attributes: body.attributes,
            };

            const results = service.evaluateAll(context);
            const resultsObj = Object.fromEntries(results);

            return c.json({ success: true, results: resultsObj, count: results.size });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to evaluate all flags'
            }, 500);
        }
    });

    app.get('/enabled/:key', async (c) => {
        try {
            const key = c.req.param('key');
            const userId = c.req.query('userId');
            const sessionId = c.req.query('sessionId');
            const environment = c.req.query('environment');

            const context: EvaluationContext = {
                userId,
                sessionId,
                environment,
            };

            const enabled = service.isEnabled(key, context);
            return c.json({ success: true, key, enabled });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to check flag'
            }, 500);
        }
    });

    app.get('/value/:key', async (c) => {
        try {
            const key = c.req.param('key');
            const defaultValue = c.req.query('default');
            const userId = c.req.query('userId');
            const sessionId = c.req.query('sessionId');
            const environment = c.req.query('environment');

            const context: EvaluationContext = {
                userId,
                sessionId,
                environment,
            };

            const value = service.getValue(key, defaultValue, context);
            return c.json({ success: true, key, value });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get flag value'
            }, 500);
        }
    });

    // ============================================
    // Rule Management
    // ============================================

    app.post('/flags/:flagId/rules', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const body = await c.req.json();

            if (body.priority === undefined || !body.rollout) {
                return c.json({
                    success: false,
                    error: 'priority and rollout are required'
                }, 400);
            }

            const rule = service.addRule(flagId, {
                name: body.name,
                priority: body.priority,
                conditions: body.conditions || [],
                rollout: body.rollout as RolloutConfig,
                value: body.value,
                enabled: body.enabled ?? true,
            });

            if (!rule) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({ success: true, rule }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add rule'
            }, 400);
        }
    });

    app.get('/flags/:flagId/rules', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const flag = service.getFlag(flagId);

            if (!flag) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({ success: true, rules: flag.rules, count: flag.rules.length });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list rules'
            }, 500);
        }
    });

    app.patch('/flags/:flagId/rules/:ruleId', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const ruleId = c.req.param('ruleId');
            const body = await c.req.json();

            const rule = service.updateRule(flagId, ruleId, body);

            if (!rule) {
                return c.json({ success: false, error: 'Flag or rule not found' }, 404);
            }

            return c.json({ success: true, rule });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update rule'
            }, 400);
        }
    });

    app.delete('/flags/:flagId/rules/:ruleId', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const ruleId = c.req.param('ruleId');

            const deleted = service.deleteRule(flagId, ruleId);

            if (!deleted) {
                return c.json({ success: false, error: 'Flag or rule not found' }, 404);
            }

            return c.json({ success: true, message: 'Rule deleted' });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete rule'
            }, 500);
        }
    });

    // ============================================
    // Environment Configuration
    // ============================================

    app.post('/flags/:flagId/environments/:environment', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const environment = c.req.param('environment');
            const body = await c.req.json();

            if (body.enabled === undefined) {
                return c.json({ success: false, error: 'enabled is required' }, 400);
            }

            const config: EnvironmentConfig = {
                enabled: body.enabled,
                rules: body.rules,
                defaultValue: body.defaultValue,
            };

            const success = service.setEnvironmentConfig(flagId, environment, config);

            if (!success) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({ success: true, environment, config });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to set environment config'
            }, 400);
        }
    });

    app.get('/flags/:flagId/environments', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const flag = service.getFlag(flagId);

            if (!flag) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({
                success: true,
                environments: flag.environments,
                count: Object.keys(flag.environments).length
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list environments'
            }, 500);
        }
    });

    app.post('/flags/:flagId/environments/:environment/enable', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const environment = c.req.param('environment');

            const success = service.toggleEnvironment(flagId, environment, true);

            if (!success) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({ success: true, environment, enabled: true });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to enable environment'
            }, 500);
        }
    });

    app.post('/flags/:flagId/environments/:environment/disable', async (c) => {
        try {
            const flagId = c.req.param('flagId');
            const environment = c.req.param('environment');

            const success = service.toggleEnvironment(flagId, environment, false);

            if (!success) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({ success: true, environment, enabled: false });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to disable environment'
            }, 500);
        }
    });

    // ============================================
    // Statistics
    // ============================================

    app.get('/stats/:key', async (c) => {
        try {
            const key = c.req.param('key');
            const stats = service.getStats(key);

            if (!stats) {
                return c.json({ success: false, error: 'Flag not found' }, 404);
            }

            return c.json({
                success: true,
                stats: {
                    ...stats,
                    byRule: Object.fromEntries(stats.byRule),
                    byEnvironment: Object.fromEntries(stats.byEnvironment),
                }
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get stats'
            }, 500);
        }
    });

    app.get('/stats', async (c) => {
        try {
            const allStats = service.getAllStats();
            const statsObj: Record<string, unknown> = {};

            for (const [key, stats] of allStats) {
                statsObj[key] = {
                    ...stats,
                    byRule: Object.fromEntries(stats.byRule),
                    byEnvironment: Object.fromEntries(stats.byEnvironment),
                };
            }

            return c.json({ success: true, stats: statsObj, count: allStats.size });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get all stats'
            }, 500);
        }
    });

    // ============================================
    // Cache Management
    // ============================================

    app.post('/cache/clear', async (c) => {
        try {
            service.clearCache();
            return c.json({ success: true, message: 'Cache cleared' });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear cache'
            }, 500);
        }
    });

    // ============================================
    // Bulk Operations
    // ============================================

    app.post('/flags/bulk', async (c) => {
        try {
            const body = await c.req.json();

            if (!Array.isArray(body.flags)) {
                return c.json({ success: false, error: 'flags array is required' }, 400);
            }

            const created = [];
            const errors = [];

            for (const flagData of body.flags) {
                try {
                    const flag = service.createFlag({
                        key: flagData.key,
                        name: flagData.name,
                        type: flagData.type as FlagType,
                        defaultValue: flagData.defaultValue,
                        description: flagData.description,
                        enabled: flagData.enabled ?? false,
                        rules: flagData.rules,
                        environments: flagData.environments,
                        tags: flagData.tags,
                        metadata: flagData.metadata,
                        createdBy: flagData.createdBy || 'system',
                    });
                    created.push(flag);
                } catch (err) {
                    errors.push({
                        key: flagData.key,
                        error: err instanceof Error ? err.message : 'Unknown error'
                    });
                }
            }

            return c.json({
                success: true,
                created: created.length,
                errors: errors.length,
                flags: created,
                errorDetails: errors.length > 0 ? errors : undefined,
            }, created.length > 0 ? 201 : 400);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create flags'
            }, 400);
        }
    });

    app.delete('/flags/bulk', async (c) => {
        try {
            const body = await c.req.json();

            if (!Array.isArray(body.flagIds)) {
                return c.json({ success: false, error: 'flagIds array is required' }, 400);
            }

            let deleted = 0;
            const notFound = [];

            for (const flagId of body.flagIds) {
                if (service.deleteFlag(flagId)) {
                    deleted++;
                } else {
                    notFound.push(flagId);
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
                error: error instanceof Error ? error.message : 'Failed to delete flags'
            }, 500);
        }
    });

    app.post('/flags/bulk/enable', async (c) => {
        try {
            const body = await c.req.json();

            if (!Array.isArray(body.flagIds)) {
                return c.json({ success: false, error: 'flagIds array is required' }, 400);
            }

            let enabled = 0;
            const notFound = [];

            for (const flagId of body.flagIds) {
                if (service.toggleFlag(flagId, true)) {
                    enabled++;
                } else {
                    notFound.push(flagId);
                }
            }

            return c.json({
                success: true,
                enabled,
                notFound: notFound.length > 0 ? notFound : undefined,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to enable flags'
            }, 500);
        }
    });

    app.post('/flags/bulk/disable', async (c) => {
        try {
            const body = await c.req.json();

            if (!Array.isArray(body.flagIds)) {
                return c.json({ success: false, error: 'flagIds array is required' }, 400);
            }

            let disabled = 0;
            const notFound = [];

            for (const flagId of body.flagIds) {
                if (service.toggleFlag(flagId, false)) {
                    disabled++;
                } else {
                    notFound.push(flagId);
                }
            }

            return c.json({
                success: true,
                disabled,
                notFound: notFound.length > 0 ? notFound : undefined,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to disable flags'
            }, 500);
        }
    });

    // ============================================
    // Health & Info
    // ============================================

    app.get('/health', async (c) => {
        const flags = service.listFlags();
        const enabledFlags = flags.filter(f => f.enabled);

        return c.json({
            success: true,
            status: 'healthy',
            totalFlags: flags.length,
            enabledFlags: enabledFlags.length,
            disabledFlags: flags.length - enabledFlags.length,
        });
    });

    app.get('/info', async (c) => {
        return c.json({
            success: true,
            flagTypes: ['boolean', 'string', 'number', 'json'],
            rolloutStrategies: ['all', 'percentage', 'user_ids', 'user_attributes', 'gradual'],
            conditionOperators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'in', 'not_in', 'regex', 'exists'],
            features: {
                caching: 'Evaluation results cached with configurable TTL',
                rules: 'Priority-based rule evaluation with conditions',
                rollout: 'Gradual rollout with percentage-based targeting',
                environments: 'Per-environment flag configuration',
                statistics: 'Evaluation tracking and analytics',
            },
        });
    });

    return app;
}
