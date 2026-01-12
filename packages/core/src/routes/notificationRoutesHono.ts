/**
 * AIOS Notification Routes (Hono)
 * 
 * API endpoints for notification management:
 * - Templates: CRUD for notification templates
 * - Channels: Configure notification channels (webhook, email, Slack, etc.)
 * - Subscriptions: Event subscriptions with filtering
 * - Notifications: Query and manage sent notifications
 * - Events: Publish events manually
 * - Stats: Notification statistics
 * 
 * @module routes/notificationRoutesHono
 */

import { Hono } from 'hono';
import { 
    getNotificationService,
    type NotificationChannel,
    type NotificationPriority,
    type NotificationStatus,
    type EventType,
} from '../services/NotificationService.js';

// ============================================
// Route Factory
// ============================================

export function createNotificationRoutes(): Hono {
    const app = new Hono();
    
    // ============================================
    // Template Routes
    // ============================================
    
    /**
     * GET /templates
     * List all notification templates
     */
    app.get('/templates', async (c) => {
        try {
            const service = getNotificationService();
            const channel = c.req.query('channel') as NotificationChannel | undefined;
            
            const templates = service.listTemplates({ channel });
            
            return c.json({
                success: true,
                data: templates,
                total: templates.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list templates',
            }, 500);
        }
    });
    
    /**
     * GET /templates/:id
     * Get a specific template
     */
    app.get('/templates/:id', async (c) => {
        try {
            const service = getNotificationService();
            const template = service.getTemplate(c.req.param('id'));
            
            if (!template) {
                return c.json({
                    success: false,
                    error: 'Template not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: template,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get template',
            }, 500);
        }
    });
    
    /**
     * POST /templates
     * Create a new notification template
     */
    app.post('/templates', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            if (!body.name || !body.channel || !body.body) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: name, channel, body',
                }, 400);
            }
            
            const template = service.createTemplate({
                name: body.name,
                description: body.description,
                channel: body.channel,
                subject: body.subject,
                title: body.title,
                body: body.body,
                bodyHtml: body.bodyHtml,
                config: body.config,
                metadata: body.metadata,
            });
            
            return c.json({
                success: true,
                data: template,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create template',
            }, 500);
        }
    });
    
    /**
     * PUT /templates/:id
     * Update a notification template
     */
    app.put('/templates/:id', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            const template = service.updateTemplate(c.req.param('id'), body);
            
            if (!template) {
                return c.json({
                    success: false,
                    error: 'Template not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: template,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update template',
            }, 500);
        }
    });
    
    /**
     * DELETE /templates/:id
     * Delete a notification template
     */
    app.delete('/templates/:id', async (c) => {
        try {
            const service = getNotificationService();
            const deleted = service.deleteTemplate(c.req.param('id'));
            
            if (!deleted) {
                return c.json({
                    success: false,
                    error: 'Template not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                message: 'Template deleted',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete template',
            }, 500);
        }
    });
    
    // ============================================
    // Channel Configuration Routes
    // ============================================
    
    /**
     * GET /channels
     * List all channel configurations
     */
    app.get('/channels', async (c) => {
        try {
            const service = getNotificationService();
            const channel = c.req.query('channel') as NotificationChannel | undefined;
            const enabled = c.req.query('enabled');
            
            const configs = service.listChannelConfigs({
                channel,
                enabled: enabled !== undefined ? enabled === 'true' : undefined,
            });
            
            return c.json({
                success: true,
                data: configs,
                total: configs.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list channels',
            }, 500);
        }
    });
    
    /**
     * GET /channels/:id
     * Get a specific channel configuration
     */
    app.get('/channels/:id', async (c) => {
        try {
            const service = getNotificationService();
            const config = service.getChannelConfig(c.req.param('id'));
            
            if (!config) {
                return c.json({
                    success: false,
                    error: 'Channel configuration not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: config,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get channel',
            }, 500);
        }
    });
    
    /**
     * POST /channels
     * Create a new channel configuration
     */
    app.post('/channels', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            if (!body.name || !body.channel || !body.config) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: name, channel, config',
                }, 400);
            }
            
            const config = service.createChannelConfig({
                name: body.name,
                channel: body.channel,
                enabled: body.enabled ?? true,
                config: body.config,
                rateLimit: body.rateLimit,
                metadata: body.metadata,
            });
            
            return c.json({
                success: true,
                data: config,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create channel',
            }, 500);
        }
    });
    
    /**
     * PUT /channels/:id
     * Update a channel configuration
     */
    app.put('/channels/:id', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            const config = service.updateChannelConfig(c.req.param('id'), body);
            
            if (!config) {
                return c.json({
                    success: false,
                    error: 'Channel configuration not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: config,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update channel',
            }, 500);
        }
    });
    
    /**
     * DELETE /channels/:id
     * Delete a channel configuration
     */
    app.delete('/channels/:id', async (c) => {
        try {
            const service = getNotificationService();
            const deleted = service.deleteChannelConfig(c.req.param('id'));
            
            if (!deleted) {
                return c.json({
                    success: false,
                    error: 'Channel configuration not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                message: 'Channel configuration deleted',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete channel',
            }, 500);
        }
    });
    
    /**
     * POST /channels/:id/test
     * Test a channel configuration
     */
    app.post('/channels/:id/test', async (c) => {
        try {
            const service = getNotificationService();
            const result = await service.testChannelConfig(c.req.param('id'));
            
            return c.json({
                success: result.success,
                data: result,
            }, result.success ? 200 : 400);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to test channel',
            }, 500);
        }
    });
    
    // ============================================
    // Subscription Routes
    // ============================================
    
    /**
     * GET /subscriptions
     * List all event subscriptions
     */
    app.get('/subscriptions', async (c) => {
        try {
            const service = getNotificationService();
            const enabled = c.req.query('enabled');
            const event = c.req.query('event') as EventType | undefined;
            
            const subscriptions = service.listSubscriptions({
                enabled: enabled !== undefined ? enabled === 'true' : undefined,
                event,
            });
            
            return c.json({
                success: true,
                data: subscriptions,
                total: subscriptions.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list subscriptions',
            }, 500);
        }
    });
    
    /**
     * GET /subscriptions/:id
     * Get a specific subscription
     */
    app.get('/subscriptions/:id', async (c) => {
        try {
            const service = getNotificationService();
            const subscription = service.getSubscription(c.req.param('id'));
            
            if (!subscription) {
                return c.json({
                    success: false,
                    error: 'Subscription not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: subscription,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get subscription',
            }, 500);
        }
    });
    
    /**
     * POST /subscriptions
     * Create a new event subscription
     */
    app.post('/subscriptions', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            if (!body.name || !body.events || !body.channels) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: name, events, channels',
                }, 400);
            }
            
            const subscription = service.createSubscription({
                name: body.name,
                description: body.description,
                enabled: body.enabled ?? true,
                events: body.events,
                filter: body.filter,
                channels: body.channels,
                batching: body.batching,
                throttle: body.throttle,
                metadata: body.metadata,
            });
            
            return c.json({
                success: true,
                data: subscription,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create subscription',
            }, 500);
        }
    });
    
    /**
     * PUT /subscriptions/:id
     * Update a subscription
     */
    app.put('/subscriptions/:id', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            const subscription = service.updateSubscription(c.req.param('id'), body);
            
            if (!subscription) {
                return c.json({
                    success: false,
                    error: 'Subscription not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: subscription,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update subscription',
            }, 500);
        }
    });
    
    /**
     * DELETE /subscriptions/:id
     * Delete a subscription
     */
    app.delete('/subscriptions/:id', async (c) => {
        try {
            const service = getNotificationService();
            const deleted = service.deleteSubscription(c.req.param('id'));
            
            if (!deleted) {
                return c.json({
                    success: false,
                    error: 'Subscription not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                message: 'Subscription deleted',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete subscription',
            }, 500);
        }
    });
    
    /**
     * PUT /subscriptions/:id/enable
     * Enable a subscription
     */
    app.put('/subscriptions/:id/enable', async (c) => {
        try {
            const service = getNotificationService();
            const subscription = service.updateSubscription(c.req.param('id'), { enabled: true });
            
            if (!subscription) {
                return c.json({
                    success: false,
                    error: 'Subscription not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: subscription,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to enable subscription',
            }, 500);
        }
    });
    
    /**
     * PUT /subscriptions/:id/disable
     * Disable a subscription
     */
    app.put('/subscriptions/:id/disable', async (c) => {
        try {
            const service = getNotificationService();
            const subscription = service.updateSubscription(c.req.param('id'), { enabled: false });
            
            if (!subscription) {
                return c.json({
                    success: false,
                    error: 'Subscription not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: subscription,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to disable subscription',
            }, 500);
        }
    });
    
    // ============================================
    // Event Publishing Routes
    // ============================================
    
    /**
     * POST /events
     * Publish an event manually
     */
    app.post('/events', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            if (!body.type || !body.source) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: type, source',
                }, 400);
            }
            
            await service.publishEvent(
                body.type as EventType,
                body.source,
                body.data || {},
                body.priority as NotificationPriority || 'normal'
            );
            
            return c.json({
                success: true,
                message: 'Event published',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to publish event',
            }, 500);
        }
    });
    
    /**
     * GET /events/types
     * List available event types
     */
    app.get('/events/types', async (c) => {
        const eventTypes: EventType[] = [
            'workflow.started',
            'workflow.completed',
            'workflow.failed',
            'workflow.step.completed',
            'workflow.step.failed',
            'agent.started',
            'agent.completed',
            'agent.failed',
            'agent.tool.called',
            'budget.warning',
            'budget.exceeded',
            'budget.reset',
            'error.critical',
            'error.warning',
            'system.health',
            'system.startup',
            'system.shutdown',
            'scheduler.job.started',
            'scheduler.job.completed',
            'scheduler.job.failed',
            'custom',
        ];
        
        return c.json({
            success: true,
            data: eventTypes,
        });
    });
    
    // ============================================
    // Notification Query Routes
    // ============================================
    
    /**
     * GET /notifications
     * List notifications with filtering
     */
    app.get('/notifications', async (c) => {
        try {
            const service = getNotificationService();
            
            const status = c.req.query('status') as NotificationStatus | undefined;
            const channel = c.req.query('channel') as NotificationChannel | undefined;
            const subscriptionId = c.req.query('subscriptionId');
            const eventType = c.req.query('eventType') as EventType | undefined;
            const since = c.req.query('since');
            const limit = c.req.query('limit');
            
            const notifications = service.listNotifications({
                status,
                channel,
                subscriptionId,
                eventType,
                since: since ? new Date(since) : undefined,
                limit: limit ? parseInt(limit, 10) : 100,
            });
            
            return c.json({
                success: true,
                data: notifications,
                total: notifications.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list notifications',
            }, 500);
        }
    });
    
    /**
     * GET /notifications/:id
     * Get a specific notification
     */
    app.get('/notifications/:id', async (c) => {
        try {
            const service = getNotificationService();
            const notification = service.getNotification(c.req.param('id'));
            
            if (!notification) {
                return c.json({
                    success: false,
                    error: 'Notification not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: notification,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get notification',
            }, 500);
        }
    });
    
    /**
     * POST /notifications/:id/retry
     * Retry a failed notification
     */
    app.post('/notifications/:id/retry', async (c) => {
        try {
            const service = getNotificationService();
            const notification = await service.retryNotification(c.req.param('id'));
            
            if (!notification) {
                return c.json({
                    success: false,
                    error: 'Notification not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: notification,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to retry notification',
            }, 500);
        }
    });
    
    /**
     * POST /notifications/:id/cancel
     * Cancel a pending notification
     */
    app.post('/notifications/:id/cancel', async (c) => {
        try {
            const service = getNotificationService();
            const notification = service.cancelNotification(c.req.param('id'));
            
            if (!notification) {
                return c.json({
                    success: false,
                    error: 'Notification not found',
                }, 404);
            }
            
            return c.json({
                success: true,
                data: notification,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to cancel notification',
            }, 500);
        }
    });
    
    // ============================================
    // Statistics Routes
    // ============================================
    
    /**
     * GET /stats
     * Get notification statistics
     */
    app.get('/stats', async (c) => {
        try {
            const service = getNotificationService();
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
     * Get dashboard summary data
     */
    app.get('/stats/dashboard', async (c) => {
        try {
            const service = getNotificationService();
            const stats = service.getStats();
            
            // Get recent failed notifications
            const recentFailed = service.listNotifications({
                status: 'failed',
                limit: 10,
            });
            
            // Get active subscriptions count
            const activeSubscriptions = service.listSubscriptions({ enabled: true });
            
            // Get channel configs count
            const enabledChannels = service.listChannelConfigs({ enabled: true });
            
            return c.json({
                success: true,
                data: {
                    stats,
                    recentFailed,
                    activeSubscriptions: activeSubscriptions.length,
                    enabledChannels: enabledChannels.length,
                    templateCount: service.listTemplates().length,
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
     * Purge old notifications
     */
    app.post('/purge', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            // Default to 30 days ago
            const olderThan = body.olderThan 
                ? new Date(body.olderThan)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            const purged = service.purgeOldNotifications(olderThan);
            
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
                error: error instanceof Error ? error.message : 'Failed to purge notifications',
            }, 500);
        }
    });
    
    // ============================================
    // Quick Setup Routes
    // ============================================
    
    /**
     * POST /setup/webhook
     * Quick setup for webhook notifications
     */
    app.post('/setup/webhook', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            if (!body.name || !body.url || !body.events) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: name, url, events',
                }, 400);
            }
            
            // Create channel config
            const channel = service.createChannelConfig({
                name: `${body.name} Webhook`,
                channel: 'webhook',
                enabled: true,
                config: {
                    url: body.url,
                    method: body.method || 'POST',
                    headers: body.headers,
                    secret: body.secret,
                },
                rateLimit: body.rateLimit,
            });
            
            // Create subscription
            const subscription = service.createSubscription({
                name: body.name,
                description: body.description,
                enabled: true,
                events: body.events,
                filter: body.filter,
                channels: [{
                    channelId: channel.id,
                }],
                batching: body.batching,
                throttle: body.throttle,
            });
            
            return c.json({
                success: true,
                data: {
                    channel,
                    subscription,
                },
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to setup webhook',
            }, 500);
        }
    });
    
    /**
     * POST /setup/slack
     * Quick setup for Slack notifications
     */
    app.post('/setup/slack', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            if (!body.name || !body.webhookUrl || !body.events) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: name, webhookUrl, events',
                }, 400);
            }
            
            // Create channel config
            const channel = service.createChannelConfig({
                name: `${body.name} Slack`,
                channel: 'slack',
                enabled: true,
                config: {
                    slackWebhookUrl: body.webhookUrl,
                    slackDefaultChannel: body.channel,
                },
                rateLimit: body.rateLimit,
            });
            
            // Create subscription
            const subscription = service.createSubscription({
                name: body.name,
                description: body.description,
                enabled: true,
                events: body.events,
                filter: body.filter,
                channels: [{
                    channelId: channel.id,
                }],
                batching: body.batching,
                throttle: body.throttle,
            });
            
            return c.json({
                success: true,
                data: {
                    channel,
                    subscription,
                },
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to setup Slack',
            }, 500);
        }
    });
    
    /**
     * POST /setup/discord
     * Quick setup for Discord notifications
     */
    app.post('/setup/discord', async (c) => {
        try {
            const service = getNotificationService();
            const body = await c.req.json();
            
            if (!body.name || !body.webhookUrl || !body.events) {
                return c.json({
                    success: false,
                    error: 'Missing required fields: name, webhookUrl, events',
                }, 400);
            }
            
            // Create channel config
            const channel = service.createChannelConfig({
                name: `${body.name} Discord`,
                channel: 'discord',
                enabled: true,
                config: {
                    discordWebhookUrl: body.webhookUrl,
                },
                rateLimit: body.rateLimit,
            });
            
            // Create subscription
            const subscription = service.createSubscription({
                name: body.name,
                description: body.description,
                enabled: true,
                events: body.events,
                filter: body.filter,
                channels: [{
                    channelId: channel.id,
                }],
                batching: body.batching,
                throttle: body.throttle,
            });
            
            return c.json({
                success: true,
                data: {
                    channel,
                    subscription,
                },
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to setup Discord',
            }, 500);
        }
    });
    
    return app;
}

export default createNotificationRoutes;
