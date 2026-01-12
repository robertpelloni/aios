/**
 * AIOS Notification Service
 * 
 * Handles alerts and event notifications with support for:
 * - Webhook notifications (HTTP callbacks)
 * - Email notifications (SMTP/API)
 * - Slack/Discord integrations
 * - Event subscriptions and filtering
 * - Notification batching and rate limiting
 * - Delivery tracking and retries
 * 
 * @module services/NotificationService
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// ============================================
// Types & Interfaces
// ============================================

export type NotificationChannel = 
    | 'webhook'
    | 'email'
    | 'slack'
    | 'discord'
    | 'teams'
    | 'sms'
    | 'push'
    | 'in_app';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationStatus = 
    | 'pending'
    | 'queued'
    | 'sending'
    | 'delivered'
    | 'failed'
    | 'retrying';

export type EventType =
    | 'workflow.started'
    | 'workflow.completed'
    | 'workflow.failed'
    | 'workflow.step.completed'
    | 'workflow.step.failed'
    | 'agent.started'
    | 'agent.completed'
    | 'agent.failed'
    | 'agent.tool.called'
    | 'budget.warning'
    | 'budget.exceeded'
    | 'budget.reset'
    | 'error.critical'
    | 'error.warning'
    | 'system.health'
    | 'system.startup'
    | 'system.shutdown'
    | 'scheduler.job.started'
    | 'scheduler.job.completed'
    | 'scheduler.job.failed'
    | 'custom';

export interface NotificationTemplate {
    id: string;
    name: string;
    description?: string;
    channel: NotificationChannel;
    
    // Template content (supports {{variable}} syntax)
    subject?: string;        // For email
    title?: string;          // For push/in-app
    body: string;            // Main content
    bodyHtml?: string;       // HTML version for email
    
    // Channel-specific config
    config?: {
        // Slack
        slackBlocks?: unknown[];
        slackAttachments?: unknown[];
        
        // Discord
        discordEmbed?: unknown;
        
        // Teams
        teamsCard?: unknown;
    };
    
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationChannelConfig {
    id: string;
    name: string;
    channel: NotificationChannel;
    enabled: boolean;
    
    // Channel-specific configuration
    config: {
        // Webhook
        url?: string;
        method?: 'GET' | 'POST' | 'PUT';
        headers?: Record<string, string>;
        secret?: string;          // For HMAC signing
        
        // Email (SMTP)
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPass?: string;
        smtpSecure?: boolean;
        fromAddress?: string;
        fromName?: string;
        
        // Email (API - SendGrid, Mailgun, etc.)
        emailProvider?: 'sendgrid' | 'mailgun' | 'ses' | 'postmark';
        apiKey?: string;
        
        // Slack
        slackWebhookUrl?: string;
        slackBotToken?: string;
        slackDefaultChannel?: string;
        
        // Discord
        discordWebhookUrl?: string;
        discordBotToken?: string;
        discordDefaultChannel?: string;
        
        // Teams
        teamsWebhookUrl?: string;
        
        // SMS (Twilio)
        twilioSid?: string;
        twilioToken?: string;
        twilioFromNumber?: string;
        
        // Push (Firebase)
        firebaseCredentials?: unknown;
    };
    
    // Rate limiting
    rateLimit?: {
        maxPerMinute?: number;
        maxPerHour?: number;
        maxPerDay?: number;
    };
    
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface EventSubscription {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    
    // What events to subscribe to
    events: EventType[];
    
    // Optional event filtering
    filter?: {
        // Filter by source
        agentIds?: string[];
        workflowIds?: string[];
        sessionIds?: string[];
        
        // Filter by severity/priority
        minPriority?: NotificationPriority;
        
        // Custom filter expression (JavaScript)
        expression?: string;
    };
    
    // Where to send notifications
    channels: {
        channelId: string;
        templateId?: string;
        
        // Channel-specific overrides
        overrides?: {
            recipients?: string[];    // Email addresses, phone numbers, etc.
            slackChannel?: string;
            discordChannel?: string;
        };
    }[];
    
    // Batching configuration
    batching?: {
        enabled: boolean;
        windowMs: number;         // Batch window in milliseconds
        maxBatchSize: number;     // Max events per batch
    };
    
    // Throttling
    throttle?: {
        maxPerMinute?: number;
        maxPerHour?: number;
        cooldownMs?: number;      // Min time between notifications
    };
    
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface Notification {
    id: string;
    subscriptionId?: string;
    templateId?: string;
    
    // Event that triggered this notification
    event: {
        type: EventType;
        source: string;
        data: Record<string, unknown>;
        timestamp: Date;
    };
    
    // Delivery details
    channel: NotificationChannel;
    channelConfigId: string;
    
    // Rendered content
    content: {
        subject?: string;
        title?: string;
        body: string;
        bodyHtml?: string;
        metadata?: Record<string, unknown>;
    };
    
    // Recipients
    recipients: string[];
    
    // Status tracking
    status: NotificationStatus;
    priority: NotificationPriority;
    
    // Delivery attempts
    attempts: {
        timestamp: Date;
        status: 'success' | 'failed';
        error?: string;
        responseCode?: number;
        responseBody?: string;
    }[];
    
    // Scheduling
    scheduledFor?: Date;
    deliveredAt?: Date;
    
    // Retry config
    maxRetries: number;
    retryCount: number;
    nextRetryAt?: Date;
    
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationBatch {
    id: string;
    subscriptionId: string;
    events: Array<{
        type: EventType;
        source: string;
        data: Record<string, unknown>;
        timestamp: Date;
    }>;
    windowStart: Date;
    windowEnd?: Date;
    notificationId?: string;    // Created notification when batch is flushed
    status: 'collecting' | 'flushed';
}

export interface NotificationStats {
    total: number;
    byStatus: Record<NotificationStatus, number>;
    byChannel: Record<NotificationChannel, number>;
    byPriority: Record<NotificationPriority, number>;
    deliveryRate: number;
    avgDeliveryTimeMs: number;
    failureRate: number;
    lastHour: {
        sent: number;
        delivered: number;
        failed: number;
    };
    last24Hours: {
        sent: number;
        delivered: number;
        failed: number;
    };
}

// ============================================
// Notification Service Implementation
// ============================================

export class NotificationService extends EventEmitter {
    private static instance: NotificationService;
    
    // Storage
    private templates: Map<string, NotificationTemplate> = new Map();
    private channelConfigs: Map<string, NotificationChannelConfig> = new Map();
    private subscriptions: Map<string, EventSubscription> = new Map();
    private notifications: Map<string, Notification> = new Map();
    private batches: Map<string, NotificationBatch> = new Map();
    
    // Processing
    private processingQueue: Notification[] = [];
    private isProcessing: boolean = false;
    private processInterval: NodeJS.Timeout | null = null;
    
    // Rate limiting tracking
    private rateLimitCounters: Map<string, {
        minute: { count: number; resetAt: Date };
        hour: { count: number; resetAt: Date };
        day: { count: number; resetAt: Date };
    }> = new Map();
    
    // Throttle tracking per subscription
    private throttleState: Map<string, {
        lastSentAt: Date;
        minuteCount: number;
        hourCount: number;
        minuteResetAt: Date;
        hourResetAt: Date;
    }> = new Map();
    
    // Batch timers
    private batchTimers: Map<string, NodeJS.Timeout> = new Map();
    
    // Stats
    private stats = {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryTimes: [] as number[],
    };
    
    // Persistence
    private dataDir: string;
    
    private constructor() {
        super();
        this.dataDir = path.join(process.cwd(), '.aios', 'notifications');
        this.ensureDataDir();
        this.loadState();
        this.startProcessing();
    }
    
    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }
    
    private ensureDataDir(): void {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }
    
    private loadState(): void {
        try {
            // Load templates
            const templatesFile = path.join(this.dataDir, 'templates.json');
            if (fs.existsSync(templatesFile)) {
                const data = JSON.parse(fs.readFileSync(templatesFile, 'utf-8'));
                for (const template of data) {
                    template.createdAt = new Date(template.createdAt);
                    template.updatedAt = new Date(template.updatedAt);
                    this.templates.set(template.id, template);
                }
            }
            
            // Load channel configs
            const channelsFile = path.join(this.dataDir, 'channels.json');
            if (fs.existsSync(channelsFile)) {
                const data = JSON.parse(fs.readFileSync(channelsFile, 'utf-8'));
                for (const config of data) {
                    config.createdAt = new Date(config.createdAt);
                    config.updatedAt = new Date(config.updatedAt);
                    this.channelConfigs.set(config.id, config);
                }
            }
            
            // Load subscriptions
            const subscriptionsFile = path.join(this.dataDir, 'subscriptions.json');
            if (fs.existsSync(subscriptionsFile)) {
                const data = JSON.parse(fs.readFileSync(subscriptionsFile, 'utf-8'));
                for (const sub of data) {
                    sub.createdAt = new Date(sub.createdAt);
                    sub.updatedAt = new Date(sub.updatedAt);
                    this.subscriptions.set(sub.id, sub);
                }
            }
            
            // Load recent notifications (last 1000)
            const notificationsFile = path.join(this.dataDir, 'notifications.json');
            if (fs.existsSync(notificationsFile)) {
                const data = JSON.parse(fs.readFileSync(notificationsFile, 'utf-8'));
                for (const notif of data.slice(-1000)) {
                    notif.event.timestamp = new Date(notif.event.timestamp);
                    notif.createdAt = new Date(notif.createdAt);
                    notif.updatedAt = new Date(notif.updatedAt);
                    if (notif.scheduledFor) notif.scheduledFor = new Date(notif.scheduledFor);
                    if (notif.deliveredAt) notif.deliveredAt = new Date(notif.deliveredAt);
                    if (notif.nextRetryAt) notif.nextRetryAt = new Date(notif.nextRetryAt);
                    for (const attempt of notif.attempts) {
                        attempt.timestamp = new Date(attempt.timestamp);
                    }
                    this.notifications.set(notif.id, notif);
                }
            }
        } catch (error) {
            console.error('Failed to load notification state:', error);
        }
    }
    
    private saveState(): void {
        try {
            // Save templates
            fs.writeFileSync(
                path.join(this.dataDir, 'templates.json'),
                JSON.stringify(Array.from(this.templates.values()), null, 2)
            );
            
            // Save channel configs (mask sensitive data)
            const maskedConfigs = Array.from(this.channelConfigs.values()).map(config => ({
                ...config,
                config: this.maskSensitiveConfig(config.config),
            }));
            fs.writeFileSync(
                path.join(this.dataDir, 'channels.json'),
                JSON.stringify(maskedConfigs, null, 2)
            );
            
            // Save subscriptions
            fs.writeFileSync(
                path.join(this.dataDir, 'subscriptions.json'),
                JSON.stringify(Array.from(this.subscriptions.values()), null, 2)
            );
            
            // Save recent notifications
            const recentNotifications = Array.from(this.notifications.values())
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 1000);
            fs.writeFileSync(
                path.join(this.dataDir, 'notifications.json'),
                JSON.stringify(recentNotifications, null, 2)
            );
        } catch (error) {
            console.error('Failed to save notification state:', error);
        }
    }
    
    private maskSensitiveConfig(config: Record<string, unknown>): Record<string, unknown> {
        const sensitiveKeys = ['apiKey', 'smtpPass', 'secret', 'slackBotToken', 'discordBotToken', 'twilioToken'];
        const masked = { ...config };
        for (const key of sensitiveKeys) {
            if (masked[key]) {
                masked[key] = '***MASKED***';
            }
        }
        return masked;
    }
    
    private startProcessing(): void {
        // Process queue every second
        this.processInterval = setInterval(() => {
            this.processQueue();
        }, 1000);
    }
    
    // ============================================
    // Template Management
    // ============================================
    
    createTemplate(input: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): NotificationTemplate {
        const template: NotificationTemplate = {
            ...input,
            id: this.generateId('tmpl'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        this.templates.set(template.id, template);
        this.saveState();
        this.emit('template.created', template);
        
        return template;
    }
    
    updateTemplate(id: string, updates: Partial<NotificationTemplate>): NotificationTemplate | null {
        const template = this.templates.get(id);
        if (!template) return null;
        
        const updated: NotificationTemplate = {
            ...template,
            ...updates,
            id: template.id,
            createdAt: template.createdAt,
            updatedAt: new Date(),
        };
        
        this.templates.set(id, updated);
        this.saveState();
        this.emit('template.updated', updated);
        
        return updated;
    }
    
    deleteTemplate(id: string): boolean {
        const deleted = this.templates.delete(id);
        if (deleted) {
            this.saveState();
            this.emit('template.deleted', { id });
        }
        return deleted;
    }
    
    getTemplate(id: string): NotificationTemplate | undefined {
        return this.templates.get(id);
    }
    
    listTemplates(filter?: { channel?: NotificationChannel }): NotificationTemplate[] {
        let templates = Array.from(this.templates.values());
        
        if (filter?.channel) {
            templates = templates.filter(t => t.channel === filter.channel);
        }
        
        return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    
    // ============================================
    // Channel Configuration
    // ============================================
    
    createChannelConfig(input: Omit<NotificationChannelConfig, 'id' | 'createdAt' | 'updatedAt'>): NotificationChannelConfig {
        const config: NotificationChannelConfig = {
            ...input,
            id: this.generateId('chan'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        this.channelConfigs.set(config.id, config);
        this.saveState();
        this.emit('channel.created', { ...config, config: this.maskSensitiveConfig(config.config) });
        
        return config;
    }
    
    updateChannelConfig(id: string, updates: Partial<NotificationChannelConfig>): NotificationChannelConfig | null {
        const config = this.channelConfigs.get(id);
        if (!config) return null;
        
        const updated: NotificationChannelConfig = {
            ...config,
            ...updates,
            id: config.id,
            createdAt: config.createdAt,
            updatedAt: new Date(),
        };
        
        this.channelConfigs.set(id, updated);
        this.saveState();
        this.emit('channel.updated', { ...updated, config: this.maskSensitiveConfig(updated.config) });
        
        return updated;
    }
    
    deleteChannelConfig(id: string): boolean {
        const deleted = this.channelConfigs.delete(id);
        if (deleted) {
            this.saveState();
            this.emit('channel.deleted', { id });
        }
        return deleted;
    }
    
    getChannelConfig(id: string): NotificationChannelConfig | undefined {
        return this.channelConfigs.get(id);
    }
    
    listChannelConfigs(filter?: { channel?: NotificationChannel; enabled?: boolean }): NotificationChannelConfig[] {
        let configs = Array.from(this.channelConfigs.values());
        
        if (filter?.channel) {
            configs = configs.filter(c => c.channel === filter.channel);
        }
        if (filter?.enabled !== undefined) {
            configs = configs.filter(c => c.enabled === filter.enabled);
        }
        
        return configs.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    async testChannelConfig(id: string): Promise<{ success: boolean; error?: string; responseTime?: number }> {
        const config = this.channelConfigs.get(id);
        if (!config) {
            return { success: false, error: 'Channel config not found' };
        }
        
        const startTime = Date.now();
        
        try {
            switch (config.channel) {
                case 'webhook':
                    return await this.testWebhook(config);
                case 'slack':
                    return await this.testSlack(config);
                case 'discord':
                    return await this.testDiscord(config);
                case 'email':
                    return await this.testEmail(config);
                default:
                    return { success: false, error: `Test not implemented for channel: ${config.channel}` };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error',
                responseTime: Date.now() - startTime,
            };
        }
    }
    
    private async testWebhook(config: NotificationChannelConfig): Promise<{ success: boolean; error?: string; responseTime?: number }> {
        const startTime = Date.now();
        const url = config.config.url;
        if (!url) {
            return { success: false, error: 'Webhook URL not configured' };
        }
        
        const response = await fetch(url, {
            method: config.config.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...config.config.headers,
            },
            body: JSON.stringify({
                type: 'test',
                message: 'AIOS Notification Service test message',
                timestamp: new Date().toISOString(),
            }),
        });
        
        return {
            success: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
            responseTime: Date.now() - startTime,
        };
    }
    
    private async testSlack(config: NotificationChannelConfig): Promise<{ success: boolean; error?: string; responseTime?: number }> {
        const startTime = Date.now();
        const webhookUrl = config.config.slackWebhookUrl;
        if (!webhookUrl) {
            return { success: false, error: 'Slack webhook URL not configured' };
        }
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: ':white_check_mark: AIOS Notification Service test message',
            }),
        });
        
        return {
            success: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}: ${await response.text()}`,
            responseTime: Date.now() - startTime,
        };
    }
    
    private async testDiscord(config: NotificationChannelConfig): Promise<{ success: boolean; error?: string; responseTime?: number }> {
        const startTime = Date.now();
        const webhookUrl = config.config.discordWebhookUrl;
        if (!webhookUrl) {
            return { success: false, error: 'Discord webhook URL not configured' };
        }
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: '✅ AIOS Notification Service test message',
            }),
        });
        
        return {
            success: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}: ${await response.text()}`,
            responseTime: Date.now() - startTime,
        };
    }
    
    private async testEmail(config: NotificationChannelConfig): Promise<{ success: boolean; error?: string; responseTime?: number }> {
        // Email test would require actual SMTP connection or API call
        // For now, just validate configuration
        const startTime = Date.now();
        
        if (config.config.emailProvider) {
            if (!config.config.apiKey) {
                return { success: false, error: 'Email API key not configured' };
            }
        } else {
            if (!config.config.smtpHost || !config.config.smtpPort) {
                return { success: false, error: 'SMTP host/port not configured' };
            }
        }
        
        return { 
            success: true, 
            responseTime: Date.now() - startTime,
        };
    }
    
    // ============================================
    // Event Subscriptions
    // ============================================
    
    createSubscription(input: Omit<EventSubscription, 'id' | 'createdAt' | 'updatedAt'>): EventSubscription {
        const subscription: EventSubscription = {
            ...input,
            id: this.generateId('sub'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        this.subscriptions.set(subscription.id, subscription);
        this.saveState();
        this.emit('subscription.created', subscription);
        
        return subscription;
    }
    
    updateSubscription(id: string, updates: Partial<EventSubscription>): EventSubscription | null {
        const subscription = this.subscriptions.get(id);
        if (!subscription) return null;
        
        const updated: EventSubscription = {
            ...subscription,
            ...updates,
            id: subscription.id,
            createdAt: subscription.createdAt,
            updatedAt: new Date(),
        };
        
        this.subscriptions.set(id, updated);
        this.saveState();
        this.emit('subscription.updated', updated);
        
        return updated;
    }
    
    deleteSubscription(id: string): boolean {
        // Clear any batch timer
        const timer = this.batchTimers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.batchTimers.delete(id);
        }
        
        const deleted = this.subscriptions.delete(id);
        if (deleted) {
            this.saveState();
            this.emit('subscription.deleted', { id });
        }
        return deleted;
    }
    
    getSubscription(id: string): EventSubscription | undefined {
        return this.subscriptions.get(id);
    }
    
    listSubscriptions(filter?: { enabled?: boolean; event?: EventType }): EventSubscription[] {
        let subscriptions = Array.from(this.subscriptions.values());
        
        if (filter?.enabled !== undefined) {
            subscriptions = subscriptions.filter(s => s.enabled === filter.enabled);
        }
        if (filter?.event) {
            subscriptions = subscriptions.filter(s => s.events.includes(filter.event!));
        }
        
        return subscriptions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    
    // ============================================
    // Event Publishing
    // ============================================
    
    async publishEvent(
        type: EventType,
        source: string,
        data: Record<string, unknown>,
        priority: NotificationPriority = 'normal'
    ): Promise<void> {
        const event = {
            type,
            source,
            data,
            timestamp: new Date(),
        };
        
        this.emit('event.published', event);
        
        // Find matching subscriptions
        const matchingSubscriptions = this.findMatchingSubscriptions(event);
        
        for (const subscription of matchingSubscriptions) {
            // Check throttling
            if (this.isThrottled(subscription)) {
                this.emit('event.throttled', { subscription: subscription.id, event });
                continue;
            }
            
            // Check if batching is enabled
            if (subscription.batching?.enabled) {
                this.addToBatch(subscription, event);
            } else {
                // Create immediate notifications
                await this.createNotificationsForSubscription(subscription, event, priority);
            }
        }
    }
    
    private findMatchingSubscriptions(event: { type: EventType; source: string; data: Record<string, unknown> }): EventSubscription[] {
        return Array.from(this.subscriptions.values()).filter(sub => {
            // Must be enabled
            if (!sub.enabled) return false;
            
            // Must match event type
            if (!sub.events.includes(event.type) && !sub.events.includes('custom')) return false;
            
            // Apply filters if present
            if (sub.filter) {
                // Filter by agent
                if (sub.filter.agentIds?.length) {
                    const agentId = event.data.agentId as string;
                    if (!agentId || !sub.filter.agentIds.includes(agentId)) return false;
                }
                
                // Filter by workflow
                if (sub.filter.workflowIds?.length) {
                    const workflowId = event.data.workflowId as string;
                    if (!workflowId || !sub.filter.workflowIds.includes(workflowId)) return false;
                }
                
                // Filter by session
                if (sub.filter.sessionIds?.length) {
                    const sessionId = event.data.sessionId as string;
                    if (!sessionId || !sub.filter.sessionIds.includes(sessionId)) return false;
                }
                
                // Custom filter expression
                if (sub.filter.expression) {
                    try {
                        const fn = new Function('event', `return ${sub.filter.expression}`);
                        if (!fn(event)) return false;
                    } catch {
                        // Invalid expression, skip filter
                    }
                }
            }
            
            return true;
        });
    }
    
    private isThrottled(subscription: EventSubscription): boolean {
        if (!subscription.throttle) return false;
        
        const now = new Date();
        let state = this.throttleState.get(subscription.id);
        
        if (!state) {
            state = {
                lastSentAt: new Date(0),
                minuteCount: 0,
                hourCount: 0,
                minuteResetAt: new Date(now.getTime() + 60000),
                hourResetAt: new Date(now.getTime() + 3600000),
            };
            this.throttleState.set(subscription.id, state);
        }
        
        // Reset counters if windows expired
        if (now >= state.minuteResetAt) {
            state.minuteCount = 0;
            state.minuteResetAt = new Date(now.getTime() + 60000);
        }
        if (now >= state.hourResetAt) {
            state.hourCount = 0;
            state.hourResetAt = new Date(now.getTime() + 3600000);
        }
        
        // Check cooldown
        if (subscription.throttle.cooldownMs) {
            const timeSinceLastSent = now.getTime() - state.lastSentAt.getTime();
            if (timeSinceLastSent < subscription.throttle.cooldownMs) {
                return true;
            }
        }
        
        // Check rate limits
        if (subscription.throttle.maxPerMinute && state.minuteCount >= subscription.throttle.maxPerMinute) {
            return true;
        }
        if (subscription.throttle.maxPerHour && state.hourCount >= subscription.throttle.maxPerHour) {
            return true;
        }
        
        return false;
    }
    
    private updateThrottleState(subscriptionId: string): void {
        const state = this.throttleState.get(subscriptionId);
        if (state) {
            state.lastSentAt = new Date();
            state.minuteCount++;
            state.hourCount++;
        }
    }
    
    private addToBatch(subscription: EventSubscription, event: { type: EventType; source: string; data: Record<string, unknown>; timestamp: Date }): void {
        const batchKey = `batch_${subscription.id}`;
        let batch = this.batches.get(batchKey);
        
        if (!batch) {
            batch = {
                id: this.generateId('batch'),
                subscriptionId: subscription.id,
                events: [],
                windowStart: new Date(),
                status: 'collecting',
            };
            this.batches.set(batchKey, batch);
            
            // Set timer to flush batch
            const timer = setTimeout(() => {
                this.flushBatch(subscription.id);
            }, subscription.batching!.windowMs);
            this.batchTimers.set(subscription.id, timer);
        }
        
        batch.events.push(event);
        
        // Check if batch is full
        if (subscription.batching!.maxBatchSize && batch.events.length >= subscription.batching!.maxBatchSize) {
            this.flushBatch(subscription.id);
        }
    }
    
    private async flushBatch(subscriptionId: string): Promise<void> {
        const batchKey = `batch_${subscriptionId}`;
        const batch = this.batches.get(batchKey);
        
        if (!batch || batch.status === 'flushed') return;
        
        // Clear timer
        const timer = this.batchTimers.get(subscriptionId);
        if (timer) {
            clearTimeout(timer);
            this.batchTimers.delete(subscriptionId);
        }
        
        batch.status = 'flushed';
        batch.windowEnd = new Date();
        
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription || batch.events.length === 0) {
            this.batches.delete(batchKey);
            return;
        }
        
        // Create a combined event for the batch
        const combinedEvent = {
            type: 'custom' as EventType,
            source: 'batch',
            data: {
                batchId: batch.id,
                eventCount: batch.events.length,
                events: batch.events,
                windowStart: batch.windowStart,
                windowEnd: batch.windowEnd,
            },
            timestamp: new Date(),
        };
        
        await this.createNotificationsForSubscription(subscription, combinedEvent, 'normal');
        
        this.batches.delete(batchKey);
    }
    
    private async createNotificationsForSubscription(
        subscription: EventSubscription,
        event: { type: EventType; source: string; data: Record<string, unknown>; timestamp: Date },
        priority: NotificationPriority
    ): Promise<void> {
        for (const channelConfig of subscription.channels) {
            const channel = this.channelConfigs.get(channelConfig.channelId);
            if (!channel || !channel.enabled) continue;
            
            // Get template if specified
            const template = channelConfig.templateId 
                ? this.templates.get(channelConfig.templateId)
                : undefined;
            
            // Render content
            const content = this.renderContent(template, event, channel.channel);
            
            // Determine recipients
            const recipients = channelConfig.overrides?.recipients || [];
            
            const notification: Notification = {
                id: this.generateId('notif'),
                subscriptionId: subscription.id,
                templateId: channelConfig.templateId,
                event,
                channel: channel.channel,
                channelConfigId: channel.id,
                content,
                recipients,
                status: 'pending',
                priority,
                attempts: [],
                maxRetries: 3,
                retryCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            this.notifications.set(notification.id, notification);
            this.processingQueue.push(notification);
            
            this.updateThrottleState(subscription.id);
            this.emit('notification.created', notification);
        }
        
        this.saveState();
    }
    
    private renderContent(
        template: NotificationTemplate | undefined,
        event: { type: EventType; source: string; data: Record<string, unknown>; timestamp: Date },
        channel: NotificationChannel
    ): Notification['content'] {
        // Default content if no template
        if (!template) {
            return {
                title: `AIOS Event: ${event.type}`,
                body: `Event from ${event.source} at ${event.timestamp.toISOString()}\n\nData: ${JSON.stringify(event.data, null, 2)}`,
            };
        }
        
        // Build context for template rendering
        const context: Record<string, unknown> = {
            event,
            type: event.type,
            source: event.source,
            data: event.data,
            timestamp: event.timestamp.toISOString(),
            ...event.data,
        };
        
        return {
            subject: template.subject ? this.interpolate(template.subject, context) : undefined,
            title: template.title ? this.interpolate(template.title, context) : undefined,
            body: this.interpolate(template.body, context),
            bodyHtml: template.bodyHtml ? this.interpolate(template.bodyHtml, context) : undefined,
        };
    }
    
    private interpolate(template: string, context: Record<string, unknown>): string {
        return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            const parts = path.split('.');
            let value: unknown = context;
            for (const part of parts) {
                if (value && typeof value === 'object') {
                    value = (value as Record<string, unknown>)[part];
                } else {
                    return match;
                }
            }
            return value !== undefined ? String(value) : match;
        });
    }
    
    // ============================================
    // Notification Processing
    // ============================================
    
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.processingQueue.length === 0) return;
        
        this.isProcessing = true;
        
        try {
            // Process up to 10 notifications at a time
            const batch = this.processingQueue.splice(0, 10);
            
            await Promise.all(batch.map(notification => this.sendNotification(notification)));
        } finally {
            this.isProcessing = false;
        }
    }
    
    private async sendNotification(notification: Notification): Promise<void> {
        const channel = this.channelConfigs.get(notification.channelConfigId);
        if (!channel) {
            notification.status = 'failed';
            notification.attempts.push({
                timestamp: new Date(),
                status: 'failed',
                error: 'Channel config not found',
            });
            this.notifications.set(notification.id, notification);
            this.emit('notification.failed', notification);
            return;
        }
        
        // Check rate limits
        if (!this.checkRateLimit(channel.id, channel.rateLimit)) {
            // Re-queue for later
            notification.scheduledFor = new Date(Date.now() + 60000);
            this.processingQueue.push(notification);
            return;
        }
        
        notification.status = 'sending';
        notification.updatedAt = new Date();
        
        const startTime = Date.now();
        
        try {
            let result: { success: boolean; error?: string; responseCode?: number; responseBody?: string };
            
            switch (channel.channel) {
                case 'webhook':
                    result = await this.sendWebhook(channel, notification);
                    break;
                case 'slack':
                    result = await this.sendSlack(channel, notification);
                    break;
                case 'discord':
                    result = await this.sendDiscord(channel, notification);
                    break;
                case 'email':
                    result = await this.sendEmail(channel, notification);
                    break;
                case 'teams':
                    result = await this.sendTeams(channel, notification);
                    break;
                default:
                    result = { success: false, error: `Unsupported channel: ${channel.channel}` };
            }
            
            const deliveryTime = Date.now() - startTime;
            
            notification.attempts.push({
                timestamp: new Date(),
                status: result.success ? 'success' : 'failed',
                error: result.error,
                responseCode: result.responseCode,
                responseBody: result.responseBody,
            });
            
            if (result.success) {
                notification.status = 'delivered';
                notification.deliveredAt = new Date();
                this.stats.totalDelivered++;
                this.stats.deliveryTimes.push(deliveryTime);
                if (this.stats.deliveryTimes.length > 1000) {
                    this.stats.deliveryTimes = this.stats.deliveryTimes.slice(-1000);
                }
                this.incrementRateLimit(channel.id);
                this.emit('notification.delivered', notification);
            } else {
                notification.retryCount++;
                if (notification.retryCount < notification.maxRetries) {
                    notification.status = 'retrying';
                    notification.nextRetryAt = new Date(Date.now() + this.getRetryDelay(notification.retryCount));
                    this.scheduleRetry(notification);
                } else {
                    notification.status = 'failed';
                    this.stats.totalFailed++;
                    this.emit('notification.failed', notification);
                }
            }
        } catch (error) {
            notification.attempts.push({
                timestamp: new Date(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            
            notification.retryCount++;
            if (notification.retryCount < notification.maxRetries) {
                notification.status = 'retrying';
                notification.nextRetryAt = new Date(Date.now() + this.getRetryDelay(notification.retryCount));
                this.scheduleRetry(notification);
            } else {
                notification.status = 'failed';
                this.stats.totalFailed++;
                this.emit('notification.failed', notification);
            }
        }
        
        notification.updatedAt = new Date();
        this.notifications.set(notification.id, notification);
        this.stats.totalSent++;
        this.saveState();
    }
    
    private getRetryDelay(retryCount: number): number {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        return Math.min(1000 * Math.pow(2, retryCount), 60000);
    }
    
    private scheduleRetry(notification: Notification): void {
        setTimeout(() => {
            this.processingQueue.push(notification);
        }, notification.nextRetryAt!.getTime() - Date.now());
    }
    
    private checkRateLimit(channelId: string, rateLimit?: NotificationChannelConfig['rateLimit']): boolean {
        if (!rateLimit) return true;
        
        const now = new Date();
        let counter = this.rateLimitCounters.get(channelId);
        
        if (!counter) {
            counter = {
                minute: { count: 0, resetAt: new Date(now.getTime() + 60000) },
                hour: { count: 0, resetAt: new Date(now.getTime() + 3600000) },
                day: { count: 0, resetAt: new Date(now.getTime() + 86400000) },
            };
            this.rateLimitCounters.set(channelId, counter);
        }
        
        // Reset expired counters
        if (now >= counter.minute.resetAt) {
            counter.minute = { count: 0, resetAt: new Date(now.getTime() + 60000) };
        }
        if (now >= counter.hour.resetAt) {
            counter.hour = { count: 0, resetAt: new Date(now.getTime() + 3600000) };
        }
        if (now >= counter.day.resetAt) {
            counter.day = { count: 0, resetAt: new Date(now.getTime() + 86400000) };
        }
        
        // Check limits
        if (rateLimit.maxPerMinute && counter.minute.count >= rateLimit.maxPerMinute) return false;
        if (rateLimit.maxPerHour && counter.hour.count >= rateLimit.maxPerHour) return false;
        if (rateLimit.maxPerDay && counter.day.count >= rateLimit.maxPerDay) return false;
        
        return true;
    }
    
    private incrementRateLimit(channelId: string): void {
        const counter = this.rateLimitCounters.get(channelId);
        if (counter) {
            counter.minute.count++;
            counter.hour.count++;
            counter.day.count++;
        }
    }
    
    // ============================================
    // Channel Senders
    // ============================================
    
    private async sendWebhook(
        channel: NotificationChannelConfig,
        notification: Notification
    ): Promise<{ success: boolean; error?: string; responseCode?: number; responseBody?: string }> {
        const url = channel.config.url;
        if (!url) {
            return { success: false, error: 'Webhook URL not configured' };
        }
        
        const body = JSON.stringify({
            id: notification.id,
            event: notification.event,
            content: notification.content,
            timestamp: new Date().toISOString(),
        });
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...channel.config.headers,
        };
        
        // Add HMAC signature if secret is configured
        if (channel.config.secret) {
            const crypto = await import('crypto');
            const signature = crypto
                .createHmac('sha256', channel.config.secret)
                .update(body)
                .digest('hex');
            headers['X-Signature'] = `sha256=${signature}`;
        }
        
        const response = await fetch(url, {
            method: channel.config.method || 'POST',
            headers,
            body,
        });
        
        const responseBody = await response.text();
        
        return {
            success: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}`,
            responseCode: response.status,
            responseBody: responseBody.slice(0, 1000),
        };
    }
    
    private async sendSlack(
        channel: NotificationChannelConfig,
        notification: Notification
    ): Promise<{ success: boolean; error?: string; responseCode?: number; responseBody?: string }> {
        const webhookUrl = channel.config.slackWebhookUrl;
        if (!webhookUrl) {
            return { success: false, error: 'Slack webhook URL not configured' };
        }
        
        const payload: Record<string, unknown> = {
            text: notification.content.body,
        };
        
        // Add blocks if template has them
        if (notification.templateId) {
            const template = this.templates.get(notification.templateId);
            if (template?.config?.slackBlocks) {
                payload.blocks = template.config.slackBlocks;
            }
            if (template?.config?.slackAttachments) {
                payload.attachments = template.config.slackAttachments;
            }
        }
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        const responseBody = await response.text();
        
        return {
            success: response.ok && responseBody === 'ok',
            error: response.ok ? undefined : responseBody,
            responseCode: response.status,
            responseBody,
        };
    }
    
    private async sendDiscord(
        channel: NotificationChannelConfig,
        notification: Notification
    ): Promise<{ success: boolean; error?: string; responseCode?: number; responseBody?: string }> {
        const webhookUrl = channel.config.discordWebhookUrl;
        if (!webhookUrl) {
            return { success: false, error: 'Discord webhook URL not configured' };
        }
        
        const payload: Record<string, unknown> = {
            content: notification.content.body.slice(0, 2000),
        };
        
        // Add embed if template has it
        if (notification.templateId) {
            const template = this.templates.get(notification.templateId);
            if (template?.config?.discordEmbed) {
                payload.embeds = [template.config.discordEmbed];
            }
        }
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        let responseBody = '';
        try {
            responseBody = await response.text();
        } catch {
            // Discord returns empty body on success
        }
        
        return {
            success: response.ok,
            error: response.ok ? undefined : responseBody || `HTTP ${response.status}`,
            responseCode: response.status,
            responseBody,
        };
    }
    
    private async sendTeams(
        channel: NotificationChannelConfig,
        notification: Notification
    ): Promise<{ success: boolean; error?: string; responseCode?: number; responseBody?: string }> {
        const webhookUrl = channel.config.teamsWebhookUrl;
        if (!webhookUrl) {
            return { success: false, error: 'Teams webhook URL not configured' };
        }
        
        const payload: Record<string, unknown> = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            summary: notification.content.title || 'AIOS Notification',
            title: notification.content.title || 'AIOS Notification',
            text: notification.content.body,
        };
        
        // Add card if template has it
        if (notification.templateId) {
            const template = this.templates.get(notification.templateId);
            if (template?.config?.teamsCard) {
                Object.assign(payload, template.config.teamsCard);
            }
        }
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        const responseBody = await response.text();
        
        return {
            success: response.ok,
            error: response.ok ? undefined : responseBody,
            responseCode: response.status,
            responseBody,
        };
    }
    
    private async sendEmail(
        channel: NotificationChannelConfig,
        notification: Notification
    ): Promise<{ success: boolean; error?: string; responseCode?: number; responseBody?: string }> {
        // For now, support SendGrid API
        if (channel.config.emailProvider === 'sendgrid') {
            return this.sendEmailSendGrid(channel, notification);
        }
        
        // SMTP would require nodemailer or similar
        return { success: false, error: 'Email provider not supported. Use SendGrid or configure SMTP externally.' };
    }
    
    private async sendEmailSendGrid(
        channel: NotificationChannelConfig,
        notification: Notification
    ): Promise<{ success: boolean; error?: string; responseCode?: number; responseBody?: string }> {
        const apiKey = channel.config.apiKey;
        if (!apiKey) {
            return { success: false, error: 'SendGrid API key not configured' };
        }
        
        if (notification.recipients.length === 0) {
            return { success: false, error: 'No recipients specified' };
        }
        
        const payload = {
            personalizations: notification.recipients.map(email => ({
                to: [{ email }],
            })),
            from: {
                email: channel.config.fromAddress || 'noreply@aios.local',
                name: channel.config.fromName || 'AIOS',
            },
            subject: notification.content.subject || 'AIOS Notification',
            content: [
                notification.content.bodyHtml
                    ? { type: 'text/html', value: notification.content.bodyHtml }
                    : { type: 'text/plain', value: notification.content.body },
            ],
        };
        
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });
        
        let responseBody = '';
        try {
            responseBody = await response.text();
        } catch {
            // SendGrid returns empty on success (202)
        }
        
        return {
            success: response.status === 202,
            error: response.status === 202 ? undefined : responseBody || `HTTP ${response.status}`,
            responseCode: response.status,
            responseBody,
        };
    }
    
    // ============================================
    // Notification Queries
    // ============================================
    
    getNotification(id: string): Notification | undefined {
        return this.notifications.get(id);
    }
    
    listNotifications(filter?: {
        status?: NotificationStatus;
        channel?: NotificationChannel;
        subscriptionId?: string;
        eventType?: EventType;
        since?: Date;
        limit?: number;
    }): Notification[] {
        let notifications = Array.from(this.notifications.values());
        
        if (filter?.status) {
            notifications = notifications.filter(n => n.status === filter.status);
        }
        if (filter?.channel) {
            notifications = notifications.filter(n => n.channel === filter.channel);
        }
        if (filter?.subscriptionId) {
            notifications = notifications.filter(n => n.subscriptionId === filter.subscriptionId);
        }
        if (filter?.eventType) {
            notifications = notifications.filter(n => n.event.type === filter.eventType);
        }
        if (filter?.since) {
            notifications = notifications.filter(n => n.createdAt >= filter.since!);
        }
        
        notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        if (filter?.limit) {
            notifications = notifications.slice(0, filter.limit);
        }
        
        return notifications;
    }
    
    async retryNotification(id: string): Promise<Notification | null> {
        const notification = this.notifications.get(id);
        if (!notification) return null;
        
        if (notification.status !== 'failed') {
            return notification;
        }
        
        notification.status = 'pending';
        notification.retryCount = 0;
        notification.updatedAt = new Date();
        
        this.processingQueue.push(notification);
        this.emit('notification.retry', notification);
        
        return notification;
    }
    
    cancelNotification(id: string): Notification | null {
        const notification = this.notifications.get(id);
        if (!notification) return null;
        
        if (notification.status === 'delivered') {
            return notification;
        }
        
        notification.status = 'failed';
        notification.updatedAt = new Date();
        notification.attempts.push({
            timestamp: new Date(),
            status: 'failed',
            error: 'Cancelled by user',
        });
        
        // Remove from queue
        const queueIndex = this.processingQueue.findIndex(n => n.id === id);
        if (queueIndex !== -1) {
            this.processingQueue.splice(queueIndex, 1);
        }
        
        this.notifications.set(id, notification);
        this.saveState();
        this.emit('notification.cancelled', notification);
        
        return notification;
    }
    
    // ============================================
    // Statistics
    // ============================================
    
    getStats(): NotificationStats {
        const notifications = Array.from(this.notifications.values());
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600000);
        const oneDayAgo = new Date(now.getTime() - 86400000);
        
        const byStatus: Record<NotificationStatus, number> = {
            pending: 0,
            queued: 0,
            sending: 0,
            delivered: 0,
            failed: 0,
            retrying: 0,
        };
        
        const byChannel: Record<NotificationChannel, number> = {
            webhook: 0,
            email: 0,
            slack: 0,
            discord: 0,
            teams: 0,
            sms: 0,
            push: 0,
            in_app: 0,
        };
        
        const byPriority: Record<NotificationPriority, number> = {
            low: 0,
            normal: 0,
            high: 0,
            urgent: 0,
        };
        
        let lastHourSent = 0, lastHourDelivered = 0, lastHourFailed = 0;
        let last24HoursSent = 0, last24HoursDelivered = 0, last24HoursFailed = 0;
        
        for (const notif of notifications) {
            byStatus[notif.status]++;
            byChannel[notif.channel]++;
            byPriority[notif.priority]++;
            
            if (notif.createdAt >= oneHourAgo) {
                lastHourSent++;
                if (notif.status === 'delivered') lastHourDelivered++;
                if (notif.status === 'failed') lastHourFailed++;
            }
            
            if (notif.createdAt >= oneDayAgo) {
                last24HoursSent++;
                if (notif.status === 'delivered') last24HoursDelivered++;
                if (notif.status === 'failed') last24HoursFailed++;
            }
        }
        
        const totalProcessed = this.stats.totalDelivered + this.stats.totalFailed;
        const deliveryRate = totalProcessed > 0 ? this.stats.totalDelivered / totalProcessed : 0;
        const failureRate = totalProcessed > 0 ? this.stats.totalFailed / totalProcessed : 0;
        const avgDeliveryTimeMs = this.stats.deliveryTimes.length > 0
            ? this.stats.deliveryTimes.reduce((a, b) => a + b, 0) / this.stats.deliveryTimes.length
            : 0;
        
        return {
            total: notifications.length,
            byStatus,
            byChannel,
            byPriority,
            deliveryRate,
            avgDeliveryTimeMs,
            failureRate,
            lastHour: {
                sent: lastHourSent,
                delivered: lastHourDelivered,
                failed: lastHourFailed,
            },
            last24Hours: {
                sent: last24HoursSent,
                delivered: last24HoursDelivered,
                failed: last24HoursFailed,
            },
        };
    }
    
    // ============================================
    // Utility Methods
    // ============================================
    
    private generateId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // ============================================
    // Cleanup
    // ============================================
    
    async shutdown(): Promise<void> {
        // Stop processing
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
        }
        
        // Clear batch timers
        for (const timer of this.batchTimers.values()) {
            clearTimeout(timer);
        }
        this.batchTimers.clear();
        
        // Save state
        this.saveState();
        
        this.emit('shutdown');
    }
    
    // Purge old notifications
    purgeOldNotifications(olderThan: Date): number {
        let purged = 0;
        
        for (const [id, notification] of this.notifications) {
            if (notification.createdAt < olderThan) {
                this.notifications.delete(id);
                purged++;
            }
        }
        
        if (purged > 0) {
            this.saveState();
        }
        
        return purged;
    }
}

// ============================================
// Singleton Export
// ============================================

let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
    if (!notificationServiceInstance) {
        notificationServiceInstance = NotificationService.getInstance();
    }
    return notificationServiceInstance;
}

export default NotificationService;
