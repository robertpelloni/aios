/**
 * AIOS Budget Service
 * 
 * Manages cost tracking and budget limits with support for:
 * - Per-agent, per-user, and global budgets
 * - Real-time cost tracking from LLM calls
 * - Budget alerts and automatic throttling
 * - Cost analytics and reporting
 * - Integration with ToolAnalyticsService
 * 
 * @module services/BudgetService
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// ============================================
// Types & Interfaces
// ============================================

export type BudgetScope = 'global' | 'user' | 'agent' | 'workflow' | 'session';

export type BudgetPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime';

export type BudgetStatus = 'active' | 'warning' | 'exceeded' | 'paused' | 'disabled';

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface CostEntry {
    id: string;
    timestamp: Date;
    
    // What incurred the cost
    source: {
        type: 'llm' | 'tool' | 'api' | 'storage' | 'compute' | 'other';
        provider?: string;       // e.g., 'openai', 'anthropic'
        model?: string;          // e.g., 'gpt-4', 'claude-3-opus'
        operation?: string;      // e.g., 'completion', 'embedding'
        toolName?: string;
        serverName?: string;
    };
    
    // Who/what incurred it
    scope: {
        userId?: string;
        agentId?: string;
        sessionId?: string;
        workflowId?: string;
        workflowExecutionId?: string;
    };
    
    // Cost details
    cost: {
        amount: number;          // In smallest currency unit (cents for USD)
        currency: string;        // e.g., 'USD'
        
        // Token breakdown for LLM calls
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        
        // Pricing used
        inputPricePerToken?: number;
        outputPricePerToken?: number;
    };
    
    // Request metadata
    metadata?: Record<string, unknown>;
}

export interface Budget {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    
    // Budget scope
    scope: BudgetScope;
    scopeId?: string;           // User ID, Agent ID, etc. (null for global)
    
    // Budget limits
    period: BudgetPeriod;
    limitAmount: number;        // In smallest currency unit
    currency: string;
    
    // Alert thresholds (percentages)
    warningThreshold: number;   // e.g., 80 means 80%
    criticalThreshold: number;  // e.g., 95 means 95%
    
    // Current period tracking
    currentPeriod: {
        startDate: Date;
        endDate: Date;
        spent: number;
        status: BudgetStatus;
    };
    
    // Actions when exceeded
    onExceeded: {
        action: 'alert' | 'throttle' | 'block';
        throttlePercent?: number;     // Reduce throughput by this %
        notifyChannels?: string[];    // Notification channel IDs
    };
    
    // Rollover settings
    rollover?: {
        enabled: boolean;
        maxRollover?: number;         // Max amount to roll over
        rolloverPercent?: number;     // % of unused budget to roll over
    };
    
    // History
    history: Array<{
        period: {
            startDate: Date;
            endDate: Date;
        };
        spent: number;
        limit: number;
        status: BudgetStatus;
    }>;
    
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface BudgetAlert {
    id: string;
    budgetId: string;
    level: AlertLevel;
    message: string;
    percentUsed: number;
    amountSpent: number;
    amountLimit: number;
    timestamp: Date;
    acknowledged: boolean;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
}

export interface CostSummary {
    period: {
        start: Date;
        end: Date;
    };
    totalCost: number;
    currency: string;
    
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    byType: Record<string, number>;
    byUser: Record<string, number>;
    byAgent: Record<string, number>;
    
    tokenStats: {
        totalInput: number;
        totalOutput: number;
        total: number;
    };
    
    topOperations: Array<{
        provider: string;
        model: string;
        count: number;
        cost: number;
    }>;
}

export interface ModelPricing {
    provider: string;
    model: string;
    inputPricePerMillion: number;    // Price per 1M tokens
    outputPricePerMillion: number;
    currency: string;
    effectiveDate: Date;
}

// Default pricing table (as of 2024)
const DEFAULT_PRICING: ModelPricing[] = [
    // OpenAI
    { provider: 'openai', model: 'gpt-4o', inputPricePerMillion: 2500, outputPricePerMillion: 10000, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'openai', model: 'gpt-4o-mini', inputPricePerMillion: 150, outputPricePerMillion: 600, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'openai', model: 'gpt-4-turbo', inputPricePerMillion: 10000, outputPricePerMillion: 30000, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'openai', model: 'gpt-4', inputPricePerMillion: 30000, outputPricePerMillion: 60000, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'openai', model: 'gpt-3.5-turbo', inputPricePerMillion: 500, outputPricePerMillion: 1500, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'openai', model: 'text-embedding-3-small', inputPricePerMillion: 20, outputPricePerMillion: 0, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'openai', model: 'text-embedding-3-large', inputPricePerMillion: 130, outputPricePerMillion: 0, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    
    // Anthropic
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', inputPricePerMillion: 3000, outputPricePerMillion: 15000, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'anthropic', model: 'claude-3-opus-20240229', inputPricePerMillion: 15000, outputPricePerMillion: 75000, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'anthropic', model: 'claude-3-sonnet-20240229', inputPricePerMillion: 3000, outputPricePerMillion: 15000, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'anthropic', model: 'claude-3-haiku-20240307', inputPricePerMillion: 250, outputPricePerMillion: 1250, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    
    // Google
    { provider: 'google', model: 'gemini-1.5-pro', inputPricePerMillion: 1250, outputPricePerMillion: 5000, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'google', model: 'gemini-1.5-flash', inputPricePerMillion: 75, outputPricePerMillion: 300, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'google', model: 'gemini-2.0-flash-exp', inputPricePerMillion: 0, outputPricePerMillion: 0, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    
    // DeepSeek
    { provider: 'deepseek', model: 'deepseek-chat', inputPricePerMillion: 140, outputPricePerMillion: 280, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'deepseek', model: 'deepseek-coder', inputPricePerMillion: 140, outputPricePerMillion: 280, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    
    // Groq
    { provider: 'groq', model: 'llama-3.1-70b-versatile', inputPricePerMillion: 590, outputPricePerMillion: 790, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'groq', model: 'llama-3.1-8b-instant', inputPricePerMillion: 50, outputPricePerMillion: 80, currency: 'USD', effectiveDate: new Date('2024-01-01') },
    { provider: 'groq', model: 'mixtral-8x7b-32768', inputPricePerMillion: 240, outputPricePerMillion: 240, currency: 'USD', effectiveDate: new Date('2024-01-01') },
];

// ============================================
// Budget Service Implementation
// ============================================

export class BudgetService extends EventEmitter {
    private static instance: BudgetService;
    
    // Storage
    private budgets: Map<string, Budget> = new Map();
    private costEntries: CostEntry[] = [];
    private alerts: Map<string, BudgetAlert> = new Map();
    private pricing: Map<string, ModelPricing> = new Map();
    
    // Throttle tracking
    private throttledScopes: Map<string, {
        budgetId: string;
        throttlePercent: number;
        until: Date;
    }> = new Map();
    
    // Blocked scopes
    private blockedScopes: Set<string> = new Set();
    
    // Stats
    private stats = {
        totalCost: 0,
        entriesRecorded: 0,
        alertsGenerated: 0,
    };
    
    // Persistence
    private dataDir: string;
    
    // Period check interval
    private periodCheckInterval: NodeJS.Timeout | null = null;
    
    private constructor() {
        super();
        this.dataDir = path.join(process.cwd(), '.aios', 'budgets');
        this.ensureDataDir();
        this.loadState();
        this.initializePricing();
        this.startPeriodCheck();
    }
    
    static getInstance(): BudgetService {
        if (!BudgetService.instance) {
            BudgetService.instance = new BudgetService();
        }
        return BudgetService.instance;
    }
    
    private ensureDataDir(): void {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }
    
    private loadState(): void {
        try {
            // Load budgets
            const budgetsFile = path.join(this.dataDir, 'budgets.json');
            if (fs.existsSync(budgetsFile)) {
                const data = JSON.parse(fs.readFileSync(budgetsFile, 'utf-8'));
                for (const budget of data) {
                    budget.createdAt = new Date(budget.createdAt);
                    budget.updatedAt = new Date(budget.updatedAt);
                    budget.currentPeriod.startDate = new Date(budget.currentPeriod.startDate);
                    budget.currentPeriod.endDate = new Date(budget.currentPeriod.endDate);
                    for (const h of budget.history) {
                        h.period.startDate = new Date(h.period.startDate);
                        h.period.endDate = new Date(h.period.endDate);
                    }
                    this.budgets.set(budget.id, budget);
                }
            }
            
            // Load recent cost entries (last 10000)
            const costsFile = path.join(this.dataDir, 'costs.json');
            if (fs.existsSync(costsFile)) {
                const data = JSON.parse(fs.readFileSync(costsFile, 'utf-8'));
                for (const entry of data.slice(-10000)) {
                    entry.timestamp = new Date(entry.timestamp);
                    this.costEntries.push(entry);
                }
            }
            
            // Load alerts
            const alertsFile = path.join(this.dataDir, 'alerts.json');
            if (fs.existsSync(alertsFile)) {
                const data = JSON.parse(fs.readFileSync(alertsFile, 'utf-8'));
                for (const alert of data) {
                    alert.timestamp = new Date(alert.timestamp);
                    if (alert.acknowledgedAt) alert.acknowledgedAt = new Date(alert.acknowledgedAt);
                    this.alerts.set(alert.id, alert);
                }
            }
            
            // Load custom pricing
            const pricingFile = path.join(this.dataDir, 'pricing.json');
            if (fs.existsSync(pricingFile)) {
                const data = JSON.parse(fs.readFileSync(pricingFile, 'utf-8'));
                for (const pricing of data) {
                    pricing.effectiveDate = new Date(pricing.effectiveDate);
                    this.pricing.set(`${pricing.provider}:${pricing.model}`, pricing);
                }
            }
        } catch (error) {
            console.error('Failed to load budget state:', error);
        }
    }
    
    private saveState(): void {
        try {
            // Save budgets
            fs.writeFileSync(
                path.join(this.dataDir, 'budgets.json'),
                JSON.stringify(Array.from(this.budgets.values()), null, 2)
            );
            
            // Save recent cost entries
            const recentCosts = this.costEntries.slice(-10000);
            fs.writeFileSync(
                path.join(this.dataDir, 'costs.json'),
                JSON.stringify(recentCosts, null, 2)
            );
            
            // Save alerts
            fs.writeFileSync(
                path.join(this.dataDir, 'alerts.json'),
                JSON.stringify(Array.from(this.alerts.values()), null, 2)
            );
            
            // Save custom pricing
            fs.writeFileSync(
                path.join(this.dataDir, 'pricing.json'),
                JSON.stringify(Array.from(this.pricing.values()), null, 2)
            );
        } catch (error) {
            console.error('Failed to save budget state:', error);
        }
    }
    
    private initializePricing(): void {
        // Load default pricing if not already loaded
        for (const pricing of DEFAULT_PRICING) {
            const key = `${pricing.provider}:${pricing.model}`;
            if (!this.pricing.has(key)) {
                this.pricing.set(key, pricing);
            }
        }
    }
    
    private startPeriodCheck(): void {
        // Check for period rollovers every minute
        this.periodCheckInterval = setInterval(() => {
            this.checkPeriodRollovers();
        }, 60000);
    }
    
    private checkPeriodRollovers(): void {
        const now = new Date();
        
        for (const [id, budget] of this.budgets) {
            if (!budget.enabled) continue;
            
            if (now >= budget.currentPeriod.endDate) {
                this.rolloverBudget(budget);
            }
        }
    }
    
    private rolloverBudget(budget: Budget): void {
        // Archive current period
        budget.history.push({
            period: {
                startDate: budget.currentPeriod.startDate,
                endDate: budget.currentPeriod.endDate,
            },
            spent: budget.currentPeriod.spent,
            limit: budget.limitAmount,
            status: budget.currentPeriod.status,
        });
        
        // Keep only last 24 periods
        if (budget.history.length > 24) {
            budget.history = budget.history.slice(-24);
        }
        
        // Calculate new period
        const { startDate, endDate } = this.calculatePeriod(budget.period);
        
        // Calculate rollover
        let rolloverAmount = 0;
        if (budget.rollover?.enabled) {
            const unused = budget.limitAmount - budget.currentPeriod.spent;
            if (unused > 0) {
                if (budget.rollover.rolloverPercent) {
                    rolloverAmount = unused * (budget.rollover.rolloverPercent / 100);
                } else {
                    rolloverAmount = unused;
                }
                if (budget.rollover.maxRollover) {
                    rolloverAmount = Math.min(rolloverAmount, budget.rollover.maxRollover);
                }
            }
        }
        
        // Reset current period
        budget.currentPeriod = {
            startDate,
            endDate,
            spent: 0,
            status: 'active',
        };
        
        // Add rollover to limit
        if (rolloverAmount > 0) {
            budget.limitAmount += rolloverAmount;
        }
        
        budget.updatedAt = new Date();
        this.budgets.set(budget.id, budget);
        this.saveState();
        
        // Clear any blocks/throttles
        const scopeKey = this.getScopeKey(budget);
        this.throttledScopes.delete(scopeKey);
        this.blockedScopes.delete(scopeKey);
        
        this.emit('budget.rollover', {
            budgetId: budget.id,
            newPeriod: budget.currentPeriod,
            rolloverAmount,
        });
    }
    
    private calculatePeriod(period: BudgetPeriod): { startDate: Date; endDate: Date } {
        const now = new Date();
        const startDate = new Date(now);
        const endDate = new Date(now);
        
        // Reset to start of day
        startDate.setHours(0, 0, 0, 0);
        
        switch (period) {
            case 'hourly':
                startDate.setMinutes(0, 0, 0);
                endDate.setTime(startDate.getTime() + 3600000);
                break;
            case 'daily':
                endDate.setTime(startDate.getTime() + 86400000);
                break;
            case 'weekly':
                startDate.setDate(startDate.getDate() - startDate.getDay());
                endDate.setTime(startDate.getTime() + 7 * 86400000);
                break;
            case 'monthly':
                startDate.setDate(1);
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(1);
                break;
            case 'yearly':
                startDate.setMonth(0, 1);
                endDate.setFullYear(endDate.getFullYear() + 1);
                endDate.setMonth(0, 1);
                break;
            case 'lifetime':
                startDate.setFullYear(2020, 0, 1);
                endDate.setFullYear(2100, 0, 1);
                break;
        }
        
        return { startDate, endDate };
    }
    
    private getScopeKey(budget: Budget): string {
        return `${budget.scope}:${budget.scopeId || 'global'}`;
    }
    
    // ============================================
    // Budget Management
    // ============================================
    
    createBudget(input: Omit<Budget, 'id' | 'currentPeriod' | 'history' | 'createdAt' | 'updatedAt'>): Budget {
        const { startDate, endDate } = this.calculatePeriod(input.period);
        
        const budget: Budget = {
            ...input,
            id: this.generateId('budget'),
            currentPeriod: {
                startDate,
                endDate,
                spent: 0,
                status: 'active',
            },
            history: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        this.budgets.set(budget.id, budget);
        this.saveState();
        this.emit('budget.created', budget);
        
        return budget;
    }
    
    updateBudget(id: string, updates: Partial<Budget>): Budget | null {
        const budget = this.budgets.get(id);
        if (!budget) return null;
        
        const updated: Budget = {
            ...budget,
            ...updates,
            id: budget.id,
            currentPeriod: budget.currentPeriod,
            history: budget.history,
            createdAt: budget.createdAt,
            updatedAt: new Date(),
        };
        
        // If period changed, recalculate
        if (updates.period && updates.period !== budget.period) {
            const { startDate, endDate } = this.calculatePeriod(updates.period);
            updated.currentPeriod = {
                ...updated.currentPeriod,
                startDate,
                endDate,
            };
        }
        
        this.budgets.set(id, updated);
        this.saveState();
        this.emit('budget.updated', updated);
        
        return updated;
    }
    
    deleteBudget(id: string): boolean {
        const budget = this.budgets.get(id);
        if (!budget) return false;
        
        // Clear any blocks/throttles
        const scopeKey = this.getScopeKey(budget);
        this.throttledScopes.delete(scopeKey);
        this.blockedScopes.delete(scopeKey);
        
        const deleted = this.budgets.delete(id);
        if (deleted) {
            this.saveState();
            this.emit('budget.deleted', { id });
        }
        return deleted;
    }
    
    getBudget(id: string): Budget | undefined {
        return this.budgets.get(id);
    }
    
    listBudgets(filter?: {
        scope?: BudgetScope;
        scopeId?: string;
        status?: BudgetStatus;
        enabled?: boolean;
    }): Budget[] {
        let budgets = Array.from(this.budgets.values());
        
        if (filter?.scope) {
            budgets = budgets.filter(b => b.scope === filter.scope);
        }
        if (filter?.scopeId) {
            budgets = budgets.filter(b => b.scopeId === filter.scopeId);
        }
        if (filter?.status) {
            budgets = budgets.filter(b => b.currentPeriod.status === filter.status);
        }
        if (filter?.enabled !== undefined) {
            budgets = budgets.filter(b => b.enabled === filter.enabled);
        }
        
        return budgets.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    
    findBudgetsForScope(scope: CostEntry['scope']): Budget[] {
        const matching: Budget[] = [];
        
        for (const budget of this.budgets.values()) {
            if (!budget.enabled) continue;
            
            switch (budget.scope) {
                case 'global':
                    matching.push(budget);
                    break;
                case 'user':
                    if (scope.userId && budget.scopeId === scope.userId) {
                        matching.push(budget);
                    }
                    break;
                case 'agent':
                    if (scope.agentId && budget.scopeId === scope.agentId) {
                        matching.push(budget);
                    }
                    break;
                case 'workflow':
                    if (scope.workflowId && budget.scopeId === scope.workflowId) {
                        matching.push(budget);
                    }
                    break;
                case 'session':
                    if (scope.sessionId && budget.scopeId === scope.sessionId) {
                        matching.push(budget);
                    }
                    break;
            }
        }
        
        return matching;
    }
    
    // ============================================
    // Cost Recording
    // ============================================
    
    recordCost(input: Omit<CostEntry, 'id' | 'timestamp'>): CostEntry {
        const entry: CostEntry = {
            ...input,
            id: this.generateId('cost'),
            timestamp: new Date(),
        };
        
        this.costEntries.push(entry);
        this.stats.totalCost += entry.cost.amount;
        this.stats.entriesRecorded++;
        
        // Update affected budgets
        const affectedBudgets = this.findBudgetsForScope(entry.scope);
        for (const budget of affectedBudgets) {
            this.addCostToBudget(budget, entry);
        }
        
        this.emit('cost.recorded', entry);
        
        // Periodically save (every 100 entries)
        if (this.stats.entriesRecorded % 100 === 0) {
            this.saveState();
        }
        
        return entry;
    }
    
    recordLLMCost(
        provider: string,
        model: string,
        inputTokens: number,
        outputTokens: number,
        scope: CostEntry['scope'],
        metadata?: Record<string, unknown>
    ): CostEntry {
        const pricing = this.getPricing(provider, model);
        
        const inputCost = (inputTokens / 1000000) * pricing.inputPricePerMillion;
        const outputCost = (outputTokens / 1000000) * pricing.outputPricePerMillion;
        const totalCost = Math.round((inputCost + outputCost) * 100); // Convert to cents
        
        return this.recordCost({
            source: {
                type: 'llm',
                provider,
                model,
                operation: 'completion',
            },
            scope,
            cost: {
                amount: totalCost,
                currency: pricing.currency,
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                inputPricePerToken: pricing.inputPricePerMillion / 1000000,
                outputPricePerToken: pricing.outputPricePerMillion / 1000000,
            },
            metadata,
        });
    }
    
    private addCostToBudget(budget: Budget, entry: CostEntry): void {
        // Convert currency if needed (simplified - assumes same currency for now)
        const cost = entry.cost.amount;
        
        budget.currentPeriod.spent += cost;
        budget.updatedAt = new Date();
        
        // Check thresholds
        const percentUsed = (budget.currentPeriod.spent / budget.limitAmount) * 100;
        
        if (percentUsed >= 100 && budget.currentPeriod.status !== 'exceeded') {
            budget.currentPeriod.status = 'exceeded';
            this.handleBudgetExceeded(budget);
        } else if (percentUsed >= budget.criticalThreshold && budget.currentPeriod.status === 'warning') {
            this.generateAlert(budget, 'critical', `Budget is at ${percentUsed.toFixed(1)}% - critical threshold reached`);
        } else if (percentUsed >= budget.warningThreshold && budget.currentPeriod.status === 'active') {
            budget.currentPeriod.status = 'warning';
            this.generateAlert(budget, 'warning', `Budget is at ${percentUsed.toFixed(1)}% - warning threshold reached`);
        }
        
        this.budgets.set(budget.id, budget);
    }
    
    private handleBudgetExceeded(budget: Budget): void {
        this.generateAlert(budget, 'critical', `Budget exceeded! Spent ${budget.currentPeriod.spent} of ${budget.limitAmount}`);
        
        const scopeKey = this.getScopeKey(budget);
        
        switch (budget.onExceeded.action) {
            case 'throttle':
                this.throttledScopes.set(scopeKey, {
                    budgetId: budget.id,
                    throttlePercent: budget.onExceeded.throttlePercent || 50,
                    until: budget.currentPeriod.endDate,
                });
                this.emit('budget.throttled', { budget, throttlePercent: budget.onExceeded.throttlePercent });
                break;
            case 'block':
                this.blockedScopes.add(scopeKey);
                this.emit('budget.blocked', { budget });
                break;
            case 'alert':
            default:
                // Alert already generated
                break;
        }
        
        this.emit('budget.exceeded', budget);
    }
    
    private generateAlert(budget: Budget, level: AlertLevel, message: string): void {
        const alert: BudgetAlert = {
            id: this.generateId('alert'),
            budgetId: budget.id,
            level,
            message,
            percentUsed: (budget.currentPeriod.spent / budget.limitAmount) * 100,
            amountSpent: budget.currentPeriod.spent,
            amountLimit: budget.limitAmount,
            timestamp: new Date(),
            acknowledged: false,
        };
        
        this.alerts.set(alert.id, alert);
        this.stats.alertsGenerated++;
        
        this.emit('budget.alert', alert);
        
        // Emit event for notification service integration
        this.emit('notification.event', {
            type: level === 'critical' ? 'budget.exceeded' : 'budget.warning',
            source: 'BudgetService',
            data: {
                budgetId: budget.id,
                budgetName: budget.name,
                alert,
            },
        });
    }
    
    // ============================================
    // Budget Checks
    // ============================================
    
    checkBudget(scope: CostEntry['scope']): {
        allowed: boolean;
        throttled: boolean;
        throttlePercent?: number;
        reason?: string;
        budgets: Array<{
            id: string;
            name: string;
            percentUsed: number;
            status: BudgetStatus;
        }>;
    } {
        const budgets = this.findBudgetsForScope(scope);
        const budgetStatuses: Array<{
            id: string;
            name: string;
            percentUsed: number;
            status: BudgetStatus;
        }> = [];
        
        let blocked = false;
        let throttled = false;
        let maxThrottlePercent = 0;
        let blockReason: string | undefined;
        
        for (const budget of budgets) {
            const percentUsed = (budget.currentPeriod.spent / budget.limitAmount) * 100;
            budgetStatuses.push({
                id: budget.id,
                name: budget.name,
                percentUsed,
                status: budget.currentPeriod.status,
            });
            
            const scopeKey = this.getScopeKey(budget);
            
            if (this.blockedScopes.has(scopeKey)) {
                blocked = true;
                blockReason = `Budget "${budget.name}" exceeded and blocking is enabled`;
            }
            
            const throttleInfo = this.throttledScopes.get(scopeKey);
            if (throttleInfo) {
                throttled = true;
                maxThrottlePercent = Math.max(maxThrottlePercent, throttleInfo.throttlePercent);
            }
        }
        
        return {
            allowed: !blocked,
            throttled,
            throttlePercent: throttled ? maxThrottlePercent : undefined,
            reason: blockReason,
            budgets: budgetStatuses,
        };
    }
    
    isBlocked(scope: CostEntry['scope']): boolean {
        const budgets = this.findBudgetsForScope(scope);
        for (const budget of budgets) {
            const scopeKey = this.getScopeKey(budget);
            if (this.blockedScopes.has(scopeKey)) {
                return true;
            }
        }
        return false;
    }
    
    getThrottlePercent(scope: CostEntry['scope']): number {
        const budgets = this.findBudgetsForScope(scope);
        let maxThrottle = 0;
        
        for (const budget of budgets) {
            const scopeKey = this.getScopeKey(budget);
            const throttleInfo = this.throttledScopes.get(scopeKey);
            if (throttleInfo) {
                maxThrottle = Math.max(maxThrottle, throttleInfo.throttlePercent);
            }
        }
        
        return maxThrottle;
    }
    
    // ============================================
    // Pricing Management
    // ============================================
    
    getPricing(provider: string, model: string): ModelPricing {
        const key = `${provider}:${model}`;
        const pricing = this.pricing.get(key);
        
        if (pricing) return pricing;
        
        // Try to find a partial match
        for (const [k, p] of this.pricing) {
            if (k.startsWith(`${provider}:`) && model.includes(p.model)) {
                return p;
            }
        }
        
        // Return default pricing
        return {
            provider,
            model,
            inputPricePerMillion: 1000,  // $1 per million tokens default
            outputPricePerMillion: 2000,
            currency: 'USD',
            effectiveDate: new Date(),
        };
    }
    
    setPricing(pricing: ModelPricing): void {
        const key = `${pricing.provider}:${pricing.model}`;
        this.pricing.set(key, pricing);
        this.saveState();
        this.emit('pricing.updated', pricing);
    }
    
    listPricing(): ModelPricing[] {
        return Array.from(this.pricing.values())
            .sort((a, b) => `${a.provider}:${a.model}`.localeCompare(`${b.provider}:${b.model}`));
    }
    
    // ============================================
    // Alert Management
    // ============================================
    
    getAlert(id: string): BudgetAlert | undefined {
        return this.alerts.get(id);
    }
    
    listAlerts(filter?: {
        budgetId?: string;
        level?: AlertLevel;
        acknowledged?: boolean;
        since?: Date;
        limit?: number;
    }): BudgetAlert[] {
        let alerts = Array.from(this.alerts.values());
        
        if (filter?.budgetId) {
            alerts = alerts.filter(a => a.budgetId === filter.budgetId);
        }
        if (filter?.level) {
            alerts = alerts.filter(a => a.level === filter.level);
        }
        if (filter?.acknowledged !== undefined) {
            alerts = alerts.filter(a => a.acknowledged === filter.acknowledged);
        }
        if (filter?.since) {
            alerts = alerts.filter(a => a.timestamp >= filter.since!);
        }
        
        alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        if (filter?.limit) {
            alerts = alerts.slice(0, filter.limit);
        }
        
        return alerts;
    }
    
    acknowledgeAlert(id: string, acknowledgedBy?: string): BudgetAlert | null {
        const alert = this.alerts.get(id);
        if (!alert) return null;
        
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date();
        alert.acknowledgedBy = acknowledgedBy;
        
        this.alerts.set(id, alert);
        this.saveState();
        this.emit('alert.acknowledged', alert);
        
        return alert;
    }
    
    acknowledgeAllAlerts(budgetId?: string, acknowledgedBy?: string): number {
        let count = 0;
        
        for (const [id, alert] of this.alerts) {
            if (alert.acknowledged) continue;
            if (budgetId && alert.budgetId !== budgetId) continue;
            
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date();
            alert.acknowledgedBy = acknowledgedBy;
            this.alerts.set(id, alert);
            count++;
        }
        
        if (count > 0) {
            this.saveState();
        }
        
        return count;
    }
    
    // ============================================
    // Cost Analytics
    // ============================================
    
    getCostSummary(
        startDate: Date,
        endDate: Date,
        filter?: {
            userId?: string;
            agentId?: string;
            provider?: string;
        }
    ): CostSummary {
        let entries = this.costEntries.filter(e => 
            e.timestamp >= startDate && e.timestamp <= endDate
        );
        
        if (filter?.userId) {
            entries = entries.filter(e => e.scope.userId === filter.userId);
        }
        if (filter?.agentId) {
            entries = entries.filter(e => e.scope.agentId === filter.agentId);
        }
        if (filter?.provider) {
            entries = entries.filter(e => e.source.provider === filter.provider);
        }
        
        const byProvider: Record<string, number> = {};
        const byModel: Record<string, number> = {};
        const byType: Record<string, number> = {};
        const byUser: Record<string, number> = {};
        const byAgent: Record<string, number> = {};
        const operationCounts: Map<string, { count: number; cost: number }> = new Map();
        
        let totalCost = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        
        for (const entry of entries) {
            totalCost += entry.cost.amount;
            
            // By provider
            const provider = entry.source.provider || 'unknown';
            byProvider[provider] = (byProvider[provider] || 0) + entry.cost.amount;
            
            // By model
            const model = entry.source.model || 'unknown';
            byModel[model] = (byModel[model] || 0) + entry.cost.amount;
            
            // By type
            byType[entry.source.type] = (byType[entry.source.type] || 0) + entry.cost.amount;
            
            // By user
            if (entry.scope.userId) {
                byUser[entry.scope.userId] = (byUser[entry.scope.userId] || 0) + entry.cost.amount;
            }
            
            // By agent
            if (entry.scope.agentId) {
                byAgent[entry.scope.agentId] = (byAgent[entry.scope.agentId] || 0) + entry.cost.amount;
            }
            
            // Token stats
            totalInputTokens += entry.cost.inputTokens || 0;
            totalOutputTokens += entry.cost.outputTokens || 0;
            
            // Operation tracking
            const opKey = `${provider}:${model}`;
            const op = operationCounts.get(opKey) || { count: 0, cost: 0 };
            op.count++;
            op.cost += entry.cost.amount;
            operationCounts.set(opKey, op);
        }
        
        const topOperations = Array.from(operationCounts.entries())
            .map(([key, stats]) => {
                const [provider, model] = key.split(':');
                return { provider, model, ...stats };
            })
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 10);
        
        return {
            period: { start: startDate, end: endDate },
            totalCost,
            currency: 'USD',
            byProvider,
            byModel,
            byType,
            byUser,
            byAgent,
            tokenStats: {
                totalInput: totalInputTokens,
                totalOutput: totalOutputTokens,
                total: totalInputTokens + totalOutputTokens,
            },
            topOperations,
        };
    }
    
    getCostTrend(
        period: 'hourly' | 'daily' | 'weekly',
        count: number = 24
    ): Array<{ period: Date; cost: number; count: number }> {
        const now = new Date();
        const result: Array<{ period: Date; cost: number; count: number }> = [];
        
        let intervalMs: number;
        switch (period) {
            case 'hourly':
                intervalMs = 3600000;
                break;
            case 'daily':
                intervalMs = 86400000;
                break;
            case 'weekly':
                intervalMs = 7 * 86400000;
                break;
        }
        
        for (let i = count - 1; i >= 0; i--) {
            const periodEnd = new Date(now.getTime() - i * intervalMs);
            const periodStart = new Date(periodEnd.getTime() - intervalMs);
            
            const entries = this.costEntries.filter(e =>
                e.timestamp >= periodStart && e.timestamp < periodEnd
            );
            
            result.push({
                period: periodStart,
                cost: entries.reduce((sum, e) => sum + e.cost.amount, 0),
                count: entries.length,
            });
        }
        
        return result;
    }
    
    // ============================================
    // Cost Entry Queries
    // ============================================
    
    listCostEntries(filter?: {
        since?: Date;
        until?: Date;
        provider?: string;
        model?: string;
        userId?: string;
        agentId?: string;
        limit?: number;
    }): CostEntry[] {
        let entries = [...this.costEntries];
        
        if (filter?.since) {
            entries = entries.filter(e => e.timestamp >= filter.since!);
        }
        if (filter?.until) {
            entries = entries.filter(e => e.timestamp <= filter.until!);
        }
        if (filter?.provider) {
            entries = entries.filter(e => e.source.provider === filter.provider);
        }
        if (filter?.model) {
            entries = entries.filter(e => e.source.model === filter.model);
        }
        if (filter?.userId) {
            entries = entries.filter(e => e.scope.userId === filter.userId);
        }
        if (filter?.agentId) {
            entries = entries.filter(e => e.scope.agentId === filter.agentId);
        }
        
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        if (filter?.limit) {
            entries = entries.slice(0, filter.limit);
        }
        
        return entries;
    }
    
    // ============================================
    // Budget Reset
    // ============================================
    
    resetBudget(id: string): Budget | null {
        const budget = this.budgets.get(id);
        if (!budget) return null;
        
        // Clear blocks/throttles
        const scopeKey = this.getScopeKey(budget);
        this.throttledScopes.delete(scopeKey);
        this.blockedScopes.delete(scopeKey);
        
        // Reset current period
        const { startDate, endDate } = this.calculatePeriod(budget.period);
        budget.currentPeriod = {
            startDate,
            endDate,
            spent: 0,
            status: 'active',
        };
        budget.updatedAt = new Date();
        
        this.budgets.set(id, budget);
        this.saveState();
        
        this.emit('budget.reset', budget);
        
        return budget;
    }
    
    // ============================================
    // Utility Methods
    // ============================================
    
    private generateId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getStats(): {
        totalBudgets: number;
        activeBudgets: number;
        exceededBudgets: number;
        totalCostRecorded: number;
        entriesRecorded: number;
        alertsGenerated: number;
        unacknowledgedAlerts: number;
    } {
        const budgets = Array.from(this.budgets.values());
        const unackAlerts = Array.from(this.alerts.values()).filter(a => !a.acknowledged);
        
        return {
            totalBudgets: budgets.length,
            activeBudgets: budgets.filter(b => b.enabled && b.currentPeriod.status === 'active').length,
            exceededBudgets: budgets.filter(b => b.currentPeriod.status === 'exceeded').length,
            totalCostRecorded: this.stats.totalCost,
            entriesRecorded: this.stats.entriesRecorded,
            alertsGenerated: this.stats.alertsGenerated,
            unacknowledgedAlerts: unackAlerts.length,
        };
    }
    
    // ============================================
    // Cleanup
    // ============================================
    
    async shutdown(): Promise<void> {
        if (this.periodCheckInterval) {
            clearInterval(this.periodCheckInterval);
            this.periodCheckInterval = null;
        }
        
        this.saveState();
        this.emit('shutdown');
    }
    
    purgeCostEntries(olderThan: Date): number {
        const before = this.costEntries.length;
        this.costEntries = this.costEntries.filter(e => e.timestamp >= olderThan);
        const purged = before - this.costEntries.length;
        
        if (purged > 0) {
            this.saveState();
        }
        
        return purged;
    }
}

// ============================================
// Singleton Export
// ============================================

let budgetServiceInstance: BudgetService | null = null;

export function getBudgetService(): BudgetService {
    if (!budgetServiceInstance) {
        budgetServiceInstance = BudgetService.getInstance();
    }
    return budgetServiceInstance;
}

export default BudgetService;
