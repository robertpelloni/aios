/**
 * AIOS Budget Routes (Hono)
 * 
 * API endpoints for budget and cost management:
 * - Budgets: CRUD for budget limits
 * - Costs: Record and query cost entries
 * - Alerts: Manage budget alerts
 * - Pricing: Configure model pricing
 * - Analytics: Cost summaries and trends
 * 
 * @module routes/budgetRoutesHono
 */

import { Hono } from 'hono';
import {
    getBudgetService,
    type BudgetScope,
    type BudgetPeriod,
    type BudgetStatus,
    type AlertLevel,
} from '../services/BudgetService.js';

// ============================================
// Route Factory
// ============================================

export function createBudgetRoutes(): Hono {
    const app = new Hono();
    
    // ============================================
    // Budget CRUD Routes
    // ============================================
    
    /**
     * GET /budgets
     * List all budgets
     */
    app.get('/budgets', async (c) => {
        try {
            const service = getBudgetService();
            
            const scope = c.req.query('scope') as BudgetScope | undefined;
            const scopeId = c.req.query('scopeId');
            const status = c.req.query('status') as BudgetStatus | undefined;
            const enabled = c.req.query('enabled');
            
            const budgets = service.listBudgets({
                scope,
                scopeId,
                status,
                enabled: enabled !== undefined ? enabled === 'true' : undefined,
            });
            
            return c.json({
                success: true,
                data: budgets,
                total: budgets.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list budgets',
            }, 500);
        }
    });
    
    /**
     * GET /budgets/:id
     * Get a specific budget
     */
    app.get('/budgets/:id', async (c) => {
        try {
            const service = getBudgetService();
            const budget = service.getBudget(c.req.param('id'));
            
            if (!budget) {
                return c.json({
                    success: false,
                    error: 'Budget not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: budget,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get budget',
            }, 500);
        }
    });
    
    /**
     * POST /budgets
     * Create a new budget
     */
    app.post('/budgets', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            if (!body.name || !body.scope || !body.period || body.limitAmount === undefined) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: name, scope, period, limitAmount',
                }, 400);
            }
            
            const budget = service.createBudget({
                name: body.name,
                description: body.description,
                enabled: body.enabled ?? true,
                scope: body.scope,
                scopeId: body.scopeId,
                period: body.period,
                limitAmount: body.limitAmount,
                currency: body.currency || 'USD',
                warningThreshold: body.warningThreshold ?? 80,
                criticalThreshold: body.criticalThreshold ?? 95,
                onExceeded: body.onExceeded || { action: 'alert' },
                rollover: body.rollover,
                metadata: body.metadata,
            });
            
            return c.json({
                success: true,
                data: budget,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create budget',
            }, 500);
        }
    });
    
    /**
     * PUT /budgets/:id
     * Update a budget
     */
    app.put('/budgets/:id', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            const budget = service.updateBudget(c.req.param('id'), body);
            
            if (!budget) {
                return c.json({
                    success: false,
                    error: 'Budget not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: budget,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update budget',
            }, 500);
        }
    });
    
    /**
     * DELETE /budgets/:id
     * Delete a budget
     */
    app.delete('/budgets/:id', async (c) => {
        try {
            const service = getBudgetService();
            const deleted = service.deleteBudget(c.req.param('id'));
            
            if (!deleted) {
                return c.json({
                    success: false,
                    error: 'Budget not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                message: 'Budget deleted',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete budget',
            }, 500);
        }
    });
    
    /**
     * POST /budgets/:id/reset
     * Reset a budget to fresh state
     */
    app.post('/budgets/:id/reset', async (c) => {
        try {
            const service = getBudgetService();
            const budget = service.resetBudget(c.req.param('id'));
            
            if (!budget) {
                return c.json({
                    success: false,
                    error: 'Budget not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: budget,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reset budget',
            }, 500);
        }
    });
    
    /**
     * PUT /budgets/:id/enable
     * Enable a budget
     */
    app.put('/budgets/:id/enable', async (c) => {
        try {
            const service = getBudgetService();
            const budget = service.updateBudget(c.req.param('id'), { enabled: true });
            
            if (!budget) {
                return c.json({
                    success: false,
                    error: 'Budget not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: budget,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to enable budget',
            }, 500);
        }
    });
    
    /**
     * PUT /budgets/:id/disable
     * Disable a budget
     */
    app.put('/budgets/:id/disable', async (c) => {
        try {
            const service = getBudgetService();
            const budget = service.updateBudget(c.req.param('id'), { enabled: false });
            
            if (!budget) {
                return c.json({
                    success: false,
                    error: 'Budget not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: budget,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to disable budget',
            }, 500);
        }
    });
    
    // ============================================
    // Budget Check Routes
    // ============================================
    
    /**
     * POST /check
     * Check budget status for a scope
     */
    app.post('/check', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            const result = service.checkBudget({
                userId: body.userId,
                agentId: body.agentId,
                sessionId: body.sessionId,
                workflowId: body.workflowId,
            });
            
            return c.json({
                success: true,
                data: result,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to check budget',
            }, 500);
        }
    });
    
    // ============================================
    // Cost Recording Routes
    // ============================================
    
    /**
     * POST /costs
     * Record a cost entry
     */
    app.post('/costs', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            if (!body.source || !body.cost) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: source, cost',
                }, 400);
            }
            
            const entry = service.recordCost({
                source: body.source,
                scope: body.scope || {},
                cost: body.cost,
                metadata: body.metadata,
            });
            
            return c.json({
                success: true,
                data: entry,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to record cost',
            }, 500);
        }
    });
    
    /**
     * POST /costs/llm
     * Record an LLM cost entry (convenience endpoint)
     */
    app.post('/costs/llm', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            if (!body.provider || !body.model || body.inputTokens === undefined || body.outputTokens === undefined) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: provider, model, inputTokens, outputTokens',
                }, 400);
            }
            
            const entry = service.recordLLMCost(
                body.provider,
                body.model,
                body.inputTokens,
                body.outputTokens,
                body.scope || {},
                body.metadata
            );
            
            return c.json({
                success: true,
                data: entry,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to record LLM cost',
            }, 500);
        }
    });
    
    /**
     * GET /costs
     * List cost entries
     */
    app.get('/costs', async (c) => {
        try {
            const service = getBudgetService();
            
            const since = c.req.query('since');
            const until = c.req.query('until');
            const provider = c.req.query('provider');
            const model = c.req.query('model');
            const userId = c.req.query('userId');
            const agentId = c.req.query('agentId');
            const limit = c.req.query('limit');
            
            const entries = service.listCostEntries({
                since: since ? new Date(since) : undefined,
                until: until ? new Date(until) : undefined,
                provider,
                model,
                userId,
                agentId,
                limit: limit ? parseInt(limit, 10) : 100,
            });
            
            return c.json({
                success: true,
                data: entries,
                total: entries.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list costs',
            }, 500);
        }
    });
    
    // ============================================
    // Alert Routes
    // ============================================
    
    /**
     * GET /alerts
     * List budget alerts
     */
    app.get('/alerts', async (c) => {
        try {
            const service = getBudgetService();
            
            const budgetId = c.req.query('budgetId');
            const level = c.req.query('level') as AlertLevel | undefined;
            const acknowledged = c.req.query('acknowledged');
            const since = c.req.query('since');
            const limit = c.req.query('limit');
            
            const alerts = service.listAlerts({
                budgetId,
                level,
                acknowledged: acknowledged !== undefined ? acknowledged === 'true' : undefined,
                since: since ? new Date(since) : undefined,
                limit: limit ? parseInt(limit, 10) : 100,
            });
            
            return c.json({
                success: true,
                data: alerts,
                total: alerts.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list alerts',
            }, 500);
        }
    });
    
    /**
     * GET /alerts/:id
     * Get a specific alert
     */
    app.get('/alerts/:id', async (c) => {
        try {
            const service = getBudgetService();
            const alert = service.getAlert(c.req.param('id'));
            
            if (!alert) {
                return c.json({
                    success: false,
                    error: 'Alert not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: alert,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get alert',
            }, 500);
        }
    });
    
    /**
     * POST /alerts/:id/acknowledge
     * Acknowledge an alert
     */
    app.post('/alerts/:id/acknowledge', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json().catch(() => ({}));
            
            const alert = service.acknowledgeAlert(c.req.param('id'), body.acknowledgedBy);
            
            if (!alert) {
                return c.json({
                    success: false,
                    error: 'Alert not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: alert,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to acknowledge alert',
            }, 500);
        }
    });
    
    /**
     * POST /alerts/acknowledge-all
     * Acknowledge all alerts
     */
    app.post('/alerts/acknowledge-all', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json().catch(() => ({}));
            
            const count = service.acknowledgeAllAlerts(body.budgetId, body.acknowledgedBy);
            
            return c.json({
                success: true,
                data: { acknowledged: count },
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to acknowledge alerts',
            }, 500);
        }
    });
    
    // ============================================
    // Pricing Routes
    // ============================================
    
    /**
     * GET /pricing
     * List all model pricing
     */
    app.get('/pricing', async (c) => {
        try {
            const service = getBudgetService();
            const pricing = service.listPricing();
            
            return c.json({
                success: true,
                data: pricing,
                total: pricing.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list pricing',
            }, 500);
        }
    });
    
    /**
     * GET /pricing/:provider/:model
     * Get pricing for a specific model
     */
    app.get('/pricing/:provider/:model', async (c) => {
        try {
            const service = getBudgetService();
            const pricing = service.getPricing(c.req.param('provider'), c.req.param('model'));
            
            return c.json({
                success: true,
                data: pricing,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get pricing',
            }, 500);
        }
    });
    
    /**
     * PUT /pricing
     * Set pricing for a model
     */
    app.put('/pricing', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            if (!body.provider || !body.model || body.inputPricePerMillion === undefined || body.outputPricePerMillion === undefined) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: provider, model, inputPricePerMillion, outputPricePerMillion',
                }, 400);
            }
            
            service.setPricing({
                provider: body.provider,
                model: body.model,
                inputPricePerMillion: body.inputPricePerMillion,
                outputPricePerMillion: body.outputPricePerMillion,
                currency: body.currency || 'USD',
                effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
            });
            
            return c.json({
                success: true,
                message: 'Pricing updated',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to set pricing',
            }, 500);
        }
    });
    
    // ============================================
    // Analytics Routes
    // ============================================
    
    /**
     * GET /analytics/summary
     * Get cost summary for a period
     */
    app.get('/analytics/summary', async (c) => {
        try {
            const service = getBudgetService();
            
            const startDate = c.req.query('startDate');
            const endDate = c.req.query('endDate');
            const userId = c.req.query('userId');
            const agentId = c.req.query('agentId');
            const provider = c.req.query('provider');
            
            // Default to last 30 days
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
            const end = endDate ? new Date(endDate) : new Date();
            
            const summary = service.getCostSummary(start, end, {
                userId,
                agentId,
                provider,
            });
            
            return c.json({
                success: true,
                data: summary,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get summary',
            }, 500);
        }
    });
    
    /**
     * GET /analytics/trend
     * Get cost trend data
     */
    app.get('/analytics/trend', async (c) => {
        try {
            const service = getBudgetService();
            
            const period = (c.req.query('period') || 'daily') as 'hourly' | 'daily' | 'weekly';
            const count = parseInt(c.req.query('count') || '24', 10);
            
            const trend = service.getCostTrend(period, count);
            
            return c.json({
                success: true,
                data: trend,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get trend',
            }, 500);
        }
    });
    
    /**
     * GET /analytics/by-provider
     * Get costs grouped by provider
     */
    app.get('/analytics/by-provider', async (c) => {
        try {
            const service = getBudgetService();
            
            const days = parseInt(c.req.query('days') || '30', 10);
            const start = new Date(Date.now() - days * 86400000);
            const end = new Date();
            
            const summary = service.getCostSummary(start, end);
            
            return c.json({
                success: true,
                data: {
                    period: { start, end },
                    byProvider: summary.byProvider,
                    byModel: summary.byModel,
                },
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get provider breakdown',
            }, 500);
        }
    });
    
    /**
     * GET /analytics/by-agent
     * Get costs grouped by agent
     */
    app.get('/analytics/by-agent', async (c) => {
        try {
            const service = getBudgetService();
            
            const days = parseInt(c.req.query('days') || '30', 10);
            const start = new Date(Date.now() - days * 86400000);
            const end = new Date();
            
            const summary = service.getCostSummary(start, end);
            
            return c.json({
                success: true,
                data: {
                    period: { start, end },
                    byAgent: summary.byAgent,
                },
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get agent breakdown',
            }, 500);
        }
    });
    
    // ============================================
    // Stats Routes
    // ============================================
    
    /**
     * GET /stats
     * Get budget service statistics
     */
    app.get('/stats', async (c) => {
        try {
            const service = getBudgetService();
            const stats = service.getStats();
            
            return c.json({
                success: true,
                data: stats,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get stats',
            }, 500);
        }
    });
    
    /**
     * GET /stats/dashboard
     * Get dashboard summary
     */
    app.get('/stats/dashboard', async (c) => {
        try {
            const service = getBudgetService();
            
            const stats = service.getStats();
            const budgets = service.listBudgets({ enabled: true });
            const recentAlerts = service.listAlerts({ acknowledged: false, limit: 10 });
            
            // Get today's summary
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todaySummary = service.getCostSummary(todayStart, new Date());
            
            // Get this month's summary
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const monthSummary = service.getCostSummary(monthStart, new Date());
            
            // Budget utilization
            const budgetUtilization = budgets.map(b => ({
                id: b.id,
                name: b.name,
                scope: b.scope,
                period: b.period,
                spent: b.currentPeriod.spent,
                limit: b.limitAmount,
                percentUsed: (b.currentPeriod.spent / b.limitAmount) * 100,
                status: b.currentPeriod.status,
            }));
            
            return c.json({
                success: true,
                data: {
                    stats,
                    todayCost: todaySummary.totalCost,
                    monthCost: monthSummary.totalCost,
                    budgetUtilization,
                    recentAlerts,
                    topModels: monthSummary.topOperations.slice(0, 5),
                },
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get dashboard',
            }, 500);
        }
    });
    
    // ============================================
    // Maintenance Routes
    // ============================================
    
    /**
     * POST /purge
     * Purge old cost entries
     */
    app.post('/purge', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            // Default to 90 days ago
            const olderThan = body.olderThan
                ? new Date(body.olderThan)
                : new Date(Date.now() - 90 * 86400000);
            
            const purged = service.purgeCostEntries(olderThan);
            
            return c.json({
                success: true,
                data: {
                    purged,
                    olderThan: olderThan.toISOString(),
                },
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to purge entries',
            }, 500);
        }
    });
    
    // ============================================
    // Quick Setup Routes
    // ============================================
    
    /**
     * POST /setup/global
     * Quick setup for global budget
     */
    app.post('/setup/global', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            if (!body.limitAmount) {
                return c.json({
                    success: false,
                    error: 'Missing required field: limitAmount',
                }, 400);
            }
            
            const budget = service.createBudget({
                name: body.name || 'Global Budget',
                description: body.description || 'Organization-wide budget limit',
                enabled: true,
                scope: 'global',
                period: body.period || 'monthly',
                limitAmount: body.limitAmount,
                currency: body.currency || 'USD',
                warningThreshold: body.warningThreshold ?? 80,
                criticalThreshold: body.criticalThreshold ?? 95,
                onExceeded: body.onExceeded || { action: 'alert' },
            });
            
            return c.json({
                success: true,
                data: budget,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to setup global budget',
            }, 500);
        }
    });
    
    /**
     * POST /setup/agent
     * Quick setup for agent budget
     */
    app.post('/setup/agent', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            if (!body.agentId || !body.limitAmount) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: agentId, limitAmount',
                }, 400);
            }
            
            const budget = service.createBudget({
                name: body.name || `Agent ${body.agentId} Budget`,
                description: body.description,
                enabled: true,
                scope: 'agent',
                scopeId: body.agentId,
                period: body.period || 'daily',
                limitAmount: body.limitAmount,
                currency: body.currency || 'USD',
                warningThreshold: body.warningThreshold ?? 80,
                criticalThreshold: body.criticalThreshold ?? 95,
                onExceeded: body.onExceeded || { action: 'throttle', throttlePercent: 50 },
            });
            
            return c.json({
                success: true,
                data: budget,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to setup agent budget',
            }, 500);
        }
    });
    
    /**
     * POST /setup/user
     * Quick setup for user budget
     */
    app.post('/setup/user', async (c) => {
        try {
            const service = getBudgetService();
            const body = await c.req.json();
            
            if (!body.userId || !body.limitAmount) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: userId, limitAmount',
                }, 400);
            }
            
            const budget = service.createBudget({
                name: body.name || `User ${body.userId} Budget`,
                description: body.description,
                enabled: true,
                scope: 'user',
                scopeId: body.userId,
                period: body.period || 'monthly',
                limitAmount: body.limitAmount,
                currency: body.currency || 'USD',
                warningThreshold: body.warningThreshold ?? 80,
                criticalThreshold: body.criticalThreshold ?? 95,
                onExceeded: body.onExceeded || { action: 'alert' },
            });
            
            return c.json({
                success: true,
                data: budget,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to setup user budget',
            }, 500);
        }
    });
    
    return app;
}

export default createBudgetRoutes;
