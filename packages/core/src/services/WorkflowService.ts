/**
 * AIOS Workflow Service
 * 
 * Orchestrates multi-step automation workflows with support for:
 * - Sequential and parallel step execution
 * - Conditional branching
 * - Loop constructs
 * - Variable passing between steps
 * - Error handling and retries
 * - Workflow templates
 * 
 * @module services/WorkflowService
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// ============================================
// Types & Interfaces
// ============================================

export type StepType = 
    | 'tool'           // Call an MCP tool
    | 'agent'          // Run an agent task
    | 'llm'            // Direct LLM call
    | 'condition'      // Conditional branch
    | 'loop'           // Loop construct
    | 'parallel'       // Parallel execution
    | 'delay'          // Wait/delay
    | 'transform'      // Data transformation
    | 'webhook'        // HTTP webhook call
    | 'script'         // Custom script execution
    | 'subworkflow';   // Nested workflow

export type WorkflowStatus = 
    | 'draft'
    | 'active'
    | 'paused'
    | 'archived';

export type ExecutionStatus = 
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'paused';

export interface WorkflowStep {
    id: string;
    name: string;
    type: StepType;
    
    // Configuration based on type
    config: {
        // Tool step
        toolName?: string;
        serverName?: string;
        arguments?: Record<string, unknown>;
        
        // Agent step
        agentId?: string;
        templateId?: string;
        task?: string;
        
        // LLM step
        provider?: string;
        model?: string;
        prompt?: string;
        systemPrompt?: string;
        
        // Condition step
        condition?: string;  // JavaScript expression
        trueBranch?: string; // Step ID to jump to
        falseBranch?: string;
        
        // Loop step
        loopType?: 'count' | 'while' | 'forEach';
        count?: number;
        whileCondition?: string;
        forEachArray?: string;  // Variable name containing array
        loopBody?: string[];    // Step IDs to execute
        
        // Parallel step
        parallelSteps?: string[]; // Step IDs to run in parallel
        waitAll?: boolean;        // Wait for all or first
        
        // Delay step
        delayMs?: number;
        
        // Transform step
        transform?: string;  // JavaScript expression
        outputVar?: string;  // Variable to store result
        
        // Webhook step
        url?: string;
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
        headers?: Record<string, string>;
        body?: string;  // Template string
        
        // Script step
        language?: 'javascript' | 'python';
        script?: string;
        
        // Subworkflow step
        workflowId?: string;
        inputMapping?: Record<string, string>;
    };
    
    // Input/Output
    inputMapping?: Record<string, string>;  // Map workflow vars to step inputs
    outputVar?: string;                      // Store step output in this var
    
    // Error handling
    onError?: 'fail' | 'continue' | 'retry' | 'goto';
    retryCount?: number;
    retryDelayMs?: number;
    errorGoto?: string;  // Step ID to jump to on error
    
    // Flow control
    nextStep?: string;   // Next step ID (default: sequential)
    
    // Metadata
    description?: string;
    timeout?: number;
    enabled?: boolean;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    version?: string;
    status: WorkflowStatus;
    
    // Steps
    steps: WorkflowStep[];
    entryPoint?: string;  // First step ID (default: first step)
    
    // Variables
    inputSchema?: Record<string, {
        type: string;
        description?: string;
        required?: boolean;
        default?: unknown;
    }>;
    variables?: Record<string, unknown>;  // Default variables
    
    // Triggers
    triggers?: Array<{
        type: 'manual' | 'schedule' | 'webhook' | 'event';
        config: Record<string, unknown>;
    }>;
    
    // Settings
    settings?: {
        maxDuration?: number;      // Max execution time in ms
        maxRetries?: number;       // Global retry limit
        continueOnError?: boolean; // Continue workflow on step error
        logLevel?: 'debug' | 'info' | 'warn' | 'error';
    };
    
    // UI Representation (React Flow)
    uiConfig?: {
        nodes: any[];
        edges: any[];
        viewport?: {
            x: number;
            y: number;
            zoom: number;
        };
    };
    
    // Metadata

    tags?: string[];
    author?: string;
    createdAt: string;
    updatedAt: string;
}

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    workflowVersion?: string;
    status: ExecutionStatus;
    
    // Execution state
    currentStepId?: string;
    variables: Record<string, unknown>;
    stepResults: Record<string, {
        status: ExecutionStatus;
        startTime: number;
        endTime?: number;
        output?: unknown;
        error?: string;
        retryCount?: number;
    }>;
    
    // Timing
    startTime: number;
    endTime?: number;
    
    // Trigger info
    triggeredBy?: string;
    triggerData?: Record<string, unknown>;
    
    // Error info
    error?: string;
    errorStep?: string;
    
    // Logs
    logs: Array<{
        timestamp: number;
        level: string;
        stepId?: string;
        message: string;
    }>;
}

// ============================================
// Workflow Executor
// ============================================

interface ExecutorContext {
    execution: WorkflowExecution;
    workflow: Workflow;
    stepHandlers: Map<StepType, StepHandler>;
}

type StepHandler = (
    step: WorkflowStep, 
    context: ExecutorContext
) => Promise<unknown>;

// ============================================
// Workflow Service
// ============================================

export class WorkflowService extends EventEmitter {
    private workflows: Map<string, Workflow> = new Map();
    private executions: Map<string, WorkflowExecution> = new Map();
    private executionHistory: WorkflowExecution[] = [];
    private stepHandlers: Map<StepType, StepHandler> = new Map();
    private persistPath?: string;
    private maxHistorySize = 1000;

    // External dependencies (injected)
    private toolCaller?: (toolName: string, args: Record<string, unknown>, serverName?: string) => Promise<unknown>;
    private agentRunner?: (agentId: string, task: string) => Promise<unknown>;
    private llmCaller?: (provider: string, model: string, prompt: string, systemPrompt?: string) => Promise<string>;

    constructor(options?: {
        persistPath?: string;
        maxHistorySize?: number;
        toolCaller?: (toolName: string, args: Record<string, unknown>, serverName?: string) => Promise<unknown>;
        agentRunner?: (agentId: string, task: string) => Promise<unknown>;
        llmCaller?: (provider: string, model: string, prompt: string, systemPrompt?: string) => Promise<string>;
    }) {
        super();
        
        if (options?.persistPath) {
            this.persistPath = options.persistPath;
            this.loadFromDisk();
        }
        
        if (options?.maxHistorySize) {
            this.maxHistorySize = options.maxHistorySize;
        }
        
        // Inject dependencies
        this.toolCaller = options?.toolCaller;
        this.agentRunner = options?.agentRunner;
        this.llmCaller = options?.llmCaller;
        
        // Register default step handlers
        this.registerDefaultHandlers();
    }

    // ========================================
    // Dependency Injection
    // ========================================

    setToolCaller(caller: typeof this.toolCaller): void {
        this.toolCaller = caller;
    }

    setAgentRunner(runner: typeof this.agentRunner): void {
        this.agentRunner = runner;
    }

    setLLMCaller(caller: typeof this.llmCaller): void {
        this.llmCaller = caller;
    }

    // ========================================
    // Workflow CRUD
    // ========================================

    createWorkflow(params: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Workflow {
        const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        
        const workflow: Workflow = {
            id,
            ...params,
            createdAt: now,
            updatedAt: now,
        };
        
        this.workflows.set(id, workflow);
        this.saveToDisk();
        this.emit('workflow:created', { workflowId: id });
        
        return workflow;
    }

    getWorkflow(id: string): Workflow | undefined {
        return this.workflows.get(id);
    }

    getAllWorkflows(): Workflow[] {
        return Array.from(this.workflows.values());
    }

    getWorkflowsByStatus(status: WorkflowStatus): Workflow[] {
        return this.getAllWorkflows().filter(w => w.status === status);
    }

    updateWorkflow(id: string, updates: Partial<Omit<Workflow, 'id' | 'createdAt'>>): Workflow {
        const workflow = this.workflows.get(id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${id}`);
        }
        
        const updated: Workflow = {
            ...workflow,
            ...updates,
            id, // Preserve ID
            createdAt: workflow.createdAt, // Preserve creation time
            updatedAt: new Date().toISOString(),
        };
        
        this.workflows.set(id, updated);
        this.saveToDisk();
        this.emit('workflow:updated', { workflowId: id });
        
        return updated;
    }

    deleteWorkflow(id: string): boolean {
        const deleted = this.workflows.delete(id);
        if (deleted) {
            this.saveToDisk();
            this.emit('workflow:deleted', { workflowId: id });
        }
        return deleted;
    }

    // ========================================
    // Step Management
    // ========================================

    addStep(workflowId: string, step: Omit<WorkflowStep, 'id'>): WorkflowStep {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        
        const stepId = `step_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        const newStep: WorkflowStep = {
            id: stepId,
            ...step,
            enabled: step.enabled !== false,
        };
        
        workflow.steps.push(newStep);
        workflow.updatedAt = new Date().toISOString();
        this.saveToDisk();
        
        return newStep;
    }

    updateStep(workflowId: string, stepId: string, updates: Partial<WorkflowStep>): WorkflowStep {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        
        const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) {
            throw new Error(`Step not found: ${stepId}`);
        }
        
        workflow.steps[stepIndex] = {
            ...workflow.steps[stepIndex],
            ...updates,
            id: stepId, // Preserve ID
        };
        
        workflow.updatedAt = new Date().toISOString();
        this.saveToDisk();
        
        return workflow.steps[stepIndex];
    }

    removeStep(workflowId: string, stepId: string): boolean {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        
        const initialLength = workflow.steps.length;
        workflow.steps = workflow.steps.filter(s => s.id !== stepId);
        
        if (workflow.steps.length < initialLength) {
            workflow.updatedAt = new Date().toISOString();
            this.saveToDisk();
            return true;
        }
        
        return false;
    }

    reorderSteps(workflowId: string, stepIds: string[]): void {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        
        const reordered: WorkflowStep[] = [];
        for (const id of stepIds) {
            const step = workflow.steps.find(s => s.id === id);
            if (step) {
                reordered.push(step);
            }
        }
        
        // Add any steps not in the provided list
        for (const step of workflow.steps) {
            if (!stepIds.includes(step.id)) {
                reordered.push(step);
            }
        }
        
        workflow.steps = reordered;
        workflow.updatedAt = new Date().toISOString();
        this.saveToDisk();
    }

    // ========================================
    // Workflow Execution
    // ========================================

    async executeWorkflow(
        workflowId: string, 
        input?: Record<string, unknown>,
        options?: {
            triggeredBy?: string;
            triggerData?: Record<string, unknown>;
        }
    ): Promise<WorkflowExecution> {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        
        if (workflow.status !== 'active') {
            throw new Error(`Workflow is not active: ${workflow.status}`);
        }
        
        // Create execution
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const execution: WorkflowExecution = {
            id: executionId,
            workflowId,
            workflowVersion: workflow.version,
            status: 'running',
            variables: {
                ...workflow.variables,
                ...input,
            },
            stepResults: {},
            startTime: Date.now(),
            triggeredBy: options?.triggeredBy,
            triggerData: options?.triggerData,
            logs: [],
        };
        
        this.executions.set(executionId, execution);
        this.emit('execution:started', { executionId, workflowId });
        
        // Execute workflow
        try {
            await this.runWorkflow(workflow, execution);
            
            execution.status = 'completed';
            execution.endTime = Date.now();
            this.emit('execution:completed', { executionId, workflowId });
            
        } catch (error) {
            execution.status = 'failed';
            execution.endTime = Date.now();
            execution.error = error instanceof Error ? error.message : String(error);
            this.emit('execution:failed', { executionId, workflowId, error: execution.error });
        }
        
        // Move to history
        this.executions.delete(executionId);
        this.addToHistory(execution);
        
        return execution;
    }

    private async runWorkflow(workflow: Workflow, execution: WorkflowExecution): Promise<void> {
        const context: ExecutorContext = {
            execution,
            workflow,
            stepHandlers: this.stepHandlers,
        };
        
        // Determine entry point
        let currentStepId: string | undefined = workflow.entryPoint || workflow.steps[0]?.id;
        
        while (currentStepId) {
            if (execution.status === 'cancelled' || execution.status === 'paused') {
                break;
            }
            
            const step = workflow.steps.find(s => s.id === currentStepId);
            if (!step) {
                throw new Error(`Step not found: ${currentStepId}`);
            }
            
            if (step.enabled === false) {
                currentStepId = this.getNextStepId(workflow, step);
                continue;
            }
            
            execution.currentStepId = currentStepId;
            this.log(execution, 'info', `Starting step: ${step.name}`, step.id);
            
            // Execute step
            const stepResult = await this.executeStep(step, context);
            
            // Determine next step
            if (stepResult.nextStepId) {
                currentStepId = stepResult.nextStepId;
            } else {
                currentStepId = this.getNextStepId(workflow, step);
            }
        }
    }

    private async executeStep(
        step: WorkflowStep, 
        context: ExecutorContext
    ): Promise<{ nextStepId?: string }> {
        const { execution } = context;
        const startTime = Date.now();
        
        execution.stepResults[step.id] = {
            status: 'running',
            startTime,
            retryCount: 0,
        };
        
        let lastError: Error | undefined;
        const maxRetries = step.retryCount || 0;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Resolve input variables
                const resolvedConfig = this.resolveVariables(step.config, execution.variables);
                const resolvedStep = { ...step, config: resolvedConfig };
                
                // Get handler
                const handler = this.stepHandlers.get(step.type);
                if (!handler) {
                    throw new Error(`No handler for step type: ${step.type}`);
                }
                
                // Execute with timeout
                const timeout = step.timeout || context.workflow.settings?.maxDuration;
                let output: unknown;
                
                if (timeout) {
                    output = await Promise.race([
                        handler(resolvedStep, context),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Step timeout')), timeout)
                        ),
                    ]);
                } else {
                    output = await handler(resolvedStep, context);
                }
                
                // Store output
                if (step.outputVar) {
                    execution.variables[step.outputVar] = output;
                }
                
                execution.stepResults[step.id] = {
                    status: 'completed',
                    startTime,
                    endTime: Date.now(),
                    output,
                    retryCount: attempt,
                };
                
                this.log(execution, 'info', `Step completed: ${step.name}`, step.id);
                
                // Handle condition step - return branch
                if (step.type === 'condition' && typeof output === 'object' && output !== null) {
                    const condResult = output as { branch?: string };
                    if (condResult.branch) {
                        return { nextStepId: condResult.branch };
                    }
                }
                
                return { nextStepId: step.nextStep };
                
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                execution.stepResults[step.id].retryCount = attempt;
                
                this.log(execution, 'error', `Step error (attempt ${attempt + 1}): ${lastError.message}`, step.id);
                
                if (attempt < maxRetries) {
                    // Wait before retry
                    const delay = step.retryDelayMs || 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // All retries failed
        execution.stepResults[step.id] = {
            status: 'failed',
            startTime,
            endTime: Date.now(),
            error: lastError?.message,
            retryCount: maxRetries,
        };
        
        execution.errorStep = step.id;
        
        // Handle error action
        switch (step.onError) {
            case 'continue':
                this.log(execution, 'warn', `Continuing after error in step: ${step.name}`, step.id);
                return { nextStepId: step.nextStep };
                
            case 'goto':
                if (step.errorGoto) {
                    return { nextStepId: step.errorGoto };
                }
                throw lastError;
                
            case 'retry':
                // Already handled above
                throw lastError;
                
            case 'fail':
            default:
                throw lastError;
        }
    }

    private getNextStepId(workflow: Workflow, currentStep: WorkflowStep): string | undefined {
        if (currentStep.nextStep) {
            return currentStep.nextStep;
        }
        
        // Get sequential next step
        const currentIndex = workflow.steps.findIndex(s => s.id === currentStep.id);
        if (currentIndex >= 0 && currentIndex < workflow.steps.length - 1) {
            return workflow.steps[currentIndex + 1].id;
        }
        
        return undefined;
    }

    private resolveVariables(obj: any, variables: Record<string, unknown>): any {
        if (typeof obj === 'string') {
            // Replace {{varName}} with variable values
            return obj.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
                const value = variables[varName];
                return value !== undefined ? String(value) : `{{${varName}}}`;
            });
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.resolveVariables(item, variables));
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const resolved: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
                resolved[key] = this.resolveVariables(value, variables);
            }
            return resolved;
        }
        
        return obj;
    }

    private log(
        execution: WorkflowExecution, 
        level: string, 
        message: string, 
        stepId?: string
    ): void {
        execution.logs.push({
            timestamp: Date.now(),
            level,
            stepId,
            message,
        });
        
        this.emit('execution:log', {
            executionId: execution.id,
            level,
            stepId,
            message,
        });
    }

    // ========================================
    // Execution Management
    // ========================================

    getExecution(id: string): WorkflowExecution | undefined {
        return this.executions.get(id) || this.executionHistory.find(e => e.id === id);
    }

    getActiveExecutions(): WorkflowExecution[] {
        return Array.from(this.executions.values());
    }

    getExecutionHistory(query?: {
        workflowId?: string;
        status?: ExecutionStatus;
        limit?: number;
    }): WorkflowExecution[] {
        let results = [...this.executionHistory];
        
        if (query?.workflowId) {
            results = results.filter(e => e.workflowId === query.workflowId);
        }
        if (query?.status) {
            results = results.filter(e => e.status === query.status);
        }
        
        results.sort((a, b) => b.startTime - a.startTime);
        
        return results.slice(0, query?.limit || 100);
    }

    cancelExecution(executionId: string): boolean {
        const execution = this.executions.get(executionId);
        if (!execution) {
            return false;
        }
        
        execution.status = 'cancelled';
        execution.endTime = Date.now();
        this.emit('execution:cancelled', { executionId });
        
        return true;
    }

    pauseExecution(executionId: string): boolean {
        const execution = this.executions.get(executionId);
        if (!execution) {
            return false;
        }
        
        execution.status = 'paused';
        this.emit('execution:paused', { executionId });
        
        return true;
    }

    // ========================================
    // Step Handlers
    // ========================================

    registerStepHandler(type: StepType, handler: StepHandler): void {
        this.stepHandlers.set(type, handler);
    }

    private registerDefaultHandlers(): void {
        // Tool step handler
        this.stepHandlers.set('tool', async (step, context) => {
            if (!this.toolCaller) {
                throw new Error('Tool caller not configured');
            }
            
            const { toolName, serverName, arguments: args } = step.config;
            if (!toolName) {
                throw new Error('Tool name required');
            }
            
            return this.toolCaller(toolName, args || {}, serverName);
        });

        // Agent step handler
        this.stepHandlers.set('agent', async (step, context) => {
            if (!this.agentRunner) {
                throw new Error('Agent runner not configured');
            }
            
            const { agentId, task } = step.config;
            if (!agentId || !task) {
                throw new Error('Agent ID and task required');
            }
            
            return this.agentRunner(agentId, task);
        });

        // LLM step handler
        this.stepHandlers.set('llm', async (step, context) => {
            if (!this.llmCaller) {
                throw new Error('LLM caller not configured');
            }
            
            const { provider, model, prompt, systemPrompt } = step.config;
            if (!provider || !model || !prompt) {
                throw new Error('Provider, model, and prompt required');
            }
            
            return this.llmCaller(provider, model, prompt, systemPrompt);
        });

        // Condition step handler
        this.stepHandlers.set('condition', async (step, context) => {
            const { condition, trueBranch, falseBranch } = step.config;
            if (!condition) {
                throw new Error('Condition expression required');
            }
            
            // Evaluate condition with variables in scope
            const vars = context.execution.variables;
            const evalFunc = new Function(...Object.keys(vars), `return ${condition}`);
            const result = evalFunc(...Object.values(vars));
            
            return {
                result,
                branch: result ? trueBranch : falseBranch,
            };
        });

        // Delay step handler
        this.stepHandlers.set('delay', async (step) => {
            const { delayMs } = step.config;
            if (!delayMs) {
                throw new Error('Delay milliseconds required');
            }
            
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return { delayed: delayMs };
        });

        // Transform step handler
        this.stepHandlers.set('transform', async (step, context) => {
            const { transform } = step.config;
            if (!transform) {
                throw new Error('Transform expression required');
            }
            
            const vars = context.execution.variables;
            const evalFunc = new Function(...Object.keys(vars), `return ${transform}`);
            return evalFunc(...Object.values(vars));
        });

        // Webhook step handler
        this.stepHandlers.set('webhook', async (step, context) => {
            const { url, method, headers, body } = step.config;
            if (!url) {
                throw new Error('Webhook URL required');
            }
            
            const response = await fetch(url, {
                method: method || 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: body ? JSON.stringify(
                    this.resolveVariables(JSON.parse(body), context.execution.variables)
                ) : undefined,
            });
            
            return {
                status: response.status,
                data: await response.json().catch(() => response.text()),
            };
        });

        // Parallel step handler
        this.stepHandlers.set('parallel', async (step, context) => {
            const { parallelSteps, waitAll } = step.config;
            if (!parallelSteps || parallelSteps.length === 0) {
                return { results: [] };
            }
            
            const stepPromises = parallelSteps.map(async (stepId) => {
                const parallelStep = context.workflow.steps.find(s => s.id === stepId);
                if (!parallelStep) {
                    throw new Error(`Parallel step not found: ${stepId}`);
                }
                
                const handler = context.stepHandlers.get(parallelStep.type);
                if (!handler) {
                    throw new Error(`No handler for step type: ${parallelStep.type}`);
                }
                
                return handler(parallelStep, context);
            });
            
            if (waitAll) {
                const results = await Promise.all(stepPromises);
                return { results };
            } else {
                const result = await Promise.race(stepPromises);
                return { result };
            }
        });

        // Subworkflow step handler
        this.stepHandlers.set('subworkflow', async (step, context) => {
            const { workflowId, inputMapping } = step.config;
            if (!workflowId) {
                throw new Error('Subworkflow ID required');
            }
            
            // Map inputs
            const input: Record<string, unknown> = {};
            if (inputMapping) {
                for (const [targetVar, sourceVar] of Object.entries(inputMapping)) {
                    input[targetVar] = context.execution.variables[sourceVar];
                }
            }
            
            const execution = await this.executeWorkflow(workflowId, input, {
                triggeredBy: `workflow:${context.workflow.id}`,
            });
            
            return {
                executionId: execution.id,
                status: execution.status,
                variables: execution.variables,
            };
        });
    }

    // ========================================
    // Templates
    // ========================================

    getWorkflowTemplates(): Array<Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>> {
        return [
            {
                name: 'Simple Tool Chain',
                description: 'Execute a sequence of tools',
                status: 'draft',
                steps: [
                    {
                        id: 'step1',
                        name: 'First Tool',
                        type: 'tool',
                        config: { toolName: '', arguments: {} },
                        outputVar: 'step1Result',
                    },
                    {
                        id: 'step2',
                        name: 'Second Tool',
                        type: 'tool',
                        config: { toolName: '', arguments: {} },
                        inputMapping: { input: 'step1Result' },
                    },
                ],
            },
            {
                name: 'Conditional Branch',
                description: 'Execute different paths based on a condition',
                status: 'draft',
                steps: [
                    {
                        id: 'check',
                        name: 'Check Condition',
                        type: 'condition',
                        config: {
                            condition: 'input.value > 10',
                            trueBranch: 'high',
                            falseBranch: 'low',
                        },
                    },
                    {
                        id: 'high',
                        name: 'High Value Path',
                        type: 'tool',
                        config: { toolName: 'process_high' },
                    },
                    {
                        id: 'low',
                        name: 'Low Value Path',
                        type: 'tool',
                        config: { toolName: 'process_low' },
                    },
                ],
            },
            {
                name: 'LLM Analysis Pipeline',
                description: 'Analyze data with LLM and take action',
                status: 'draft',
                steps: [
                    {
                        id: 'fetch',
                        name: 'Fetch Data',
                        type: 'tool',
                        config: { toolName: 'fetch_data' },
                        outputVar: 'data',
                    },
                    {
                        id: 'analyze',
                        name: 'Analyze with LLM',
                        type: 'llm',
                        config: {
                            provider: 'anthropic',
                            model: 'claude-sonnet-4-20250514',
                            prompt: 'Analyze this data and provide insights: {{data}}',
                        },
                        outputVar: 'analysis',
                    },
                    {
                        id: 'action',
                        name: 'Take Action',
                        type: 'agent',
                        config: {
                            agentId: 'action-taker',
                            task: 'Based on this analysis: {{analysis}}, take appropriate action.',
                        },
                    },
                ],
            },
        ];
    }

    createFromTemplate(templateIndex: number, name?: string): Workflow {
        const templates = this.getWorkflowTemplates();
        if (templateIndex < 0 || templateIndex >= templates.length) {
            throw new Error('Invalid template index');
        }
        
        const template = templates[templateIndex];
        return this.createWorkflow({
            ...template,
            name: name || template.name,
            status: 'draft',
        });
    }

    // ========================================
    // Persistence
    // ========================================

    private addToHistory(execution: WorkflowExecution): void {
        this.executionHistory.push(execution);
        
        if (this.executionHistory.length > this.maxHistorySize) {
            this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
        }
    }

    private loadFromDisk(): void {
        if (!this.persistPath) return;
        
        try {
            const workflowsPath = path.join(this.persistPath, 'workflows.json');
            const historyPath = path.join(this.persistPath, 'execution-history.json');
            
            if (fs.existsSync(workflowsPath)) {
                const data = JSON.parse(fs.readFileSync(workflowsPath, 'utf-8'));
                for (const workflow of data) {
                    this.workflows.set(workflow.id, workflow);
                }
            }
            
            if (fs.existsSync(historyPath)) {
                this.executionHistory = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load workflows from disk:', error);
        }
    }

    saveToDisk(): void {
        if (!this.persistPath) return;
        
        try {
            if (!fs.existsSync(this.persistPath)) {
                fs.mkdirSync(this.persistPath, { recursive: true });
            }
            
            const workflowsPath = path.join(this.persistPath, 'workflows.json');
            const historyPath = path.join(this.persistPath, 'execution-history.json');
            
            fs.writeFileSync(workflowsPath, JSON.stringify(Array.from(this.workflows.values()), null, 2));
            fs.writeFileSync(historyPath, JSON.stringify(this.executionHistory, null, 2));
        } catch (error) {
            console.error('Failed to save workflows to disk:', error);
        }
    }

    // ========================================
    // Stats
    // ========================================

    getStats(): {
        totalWorkflows: number;
        activeWorkflows: number;
        totalExecutions: number;
        activeExecutions: number;
        successRate: number;
    } {
        const active = this.getAllWorkflows().filter(w => w.status === 'active').length;
        const completedExecs = this.executionHistory.filter(e => e.status === 'completed').length;
        const totalExecs = this.executionHistory.length;
        
        return {
            totalWorkflows: this.workflows.size,
            activeWorkflows: active,
            totalExecutions: totalExecs,
            activeExecutions: this.executions.size,
            successRate: totalExecs > 0 ? completedExecs / totalExecs : 0,
        };
    }
}

// ============================================
// Singleton
// ============================================

let serviceInstance: WorkflowService | null = null;

export function getWorkflowService(options?: {
    persistPath?: string;
    maxHistorySize?: number;
}): WorkflowService {
    if (!serviceInstance) {
        serviceInstance = new WorkflowService(options);
    }
    return serviceInstance;
}
