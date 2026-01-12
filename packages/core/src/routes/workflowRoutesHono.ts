/**
 * AIOS Workflow API Routes (Hono)
 * 
 * REST API endpoints for workflow automation management.
 * 
 * Endpoints:
 * - GET    /api/workflows              - List all workflows
 * - GET    /api/workflows/stats        - Get workflow statistics
 * - GET    /api/workflows/templates    - Get workflow templates
 * - POST   /api/workflows              - Create workflow
 * - POST   /api/workflows/from-template - Create from template
 * - GET    /api/workflows/:id          - Get workflow
 * - PUT    /api/workflows/:id          - Update workflow
 * - DELETE /api/workflows/:id          - Delete workflow
 * - POST   /api/workflows/:id/execute  - Execute workflow
 * - POST   /api/workflows/:id/steps    - Add step
 * - PUT    /api/workflows/:id/steps/:stepId - Update step
 * - DELETE /api/workflows/:id/steps/:stepId - Delete step
 * - POST   /api/workflows/:id/steps/reorder - Reorder steps
 * - GET    /api/workflows/executions   - List executions
 * - GET    /api/workflows/executions/active - Active executions
 * - GET    /api/workflows/executions/:id - Get execution
 * - POST   /api/workflows/executions/:id/cancel - Cancel execution
 * - POST   /api/workflows/executions/:id/pause - Pause execution
 * 
 * @module routes/workflowRoutesHono
 */

import { Hono } from 'hono';
import { 
    getWorkflowService,
    Workflow,
    WorkflowStep,
    WorkflowStatus,
    ExecutionStatus,
} from '../services/WorkflowService.js';

// ============================================
// Route Factory
// ============================================

export function createWorkflowRoutes(): Hono {
    const app = new Hono();
    const service = getWorkflowService();

    // ========================================
    // Workflow CRUD
    // ========================================

    /**
     * GET /api/workflows
     * List all workflows
     */
    app.get('/', (c) => {
        try {
            const status = c.req.query('status') as WorkflowStatus | undefined;
            
            let workflows: Workflow[];
            if (status) {
                workflows = service.getWorkflowsByStatus(status);
            } else {
                workflows = service.getAllWorkflows();
            }

            return c.json({
                success: true,
                workflows,
                count: workflows.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * GET /api/workflows/stats
     * Get workflow statistics
     */
    app.get('/stats', (c) => {
        try {
            const stats = service.getStats();
            return c.json({
                success: true,
                stats,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * GET /api/workflows/templates
     * Get available workflow templates
     */
    app.get('/templates', (c) => {
        try {
            const templates = service.getWorkflowTemplates();
            return c.json({
                success: true,
                templates,
                count: templates.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /api/workflows
     * Create a new workflow
     */
    app.post('/', async (c) => {
        try {
            const body = await c.req.json();
            
            if (!body.name) {
                return c.json({ success: false, error: 'name required' }, 400);
            }

            const workflow = service.createWorkflow({
                name: body.name,
                description: body.description,
                version: body.version,
                status: body.status || 'draft',
                steps: body.steps || [],
                entryPoint: body.entryPoint,
                inputSchema: body.inputSchema,
                variables: body.variables,
                triggers: body.triggers,
                settings: body.settings,
                tags: body.tags,
                author: body.author,
            });

            return c.json({
                success: true,
                workflow,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /api/workflows/from-template
     * Create workflow from template
     */
    app.post('/from-template', async (c) => {
        try {
            const body = await c.req.json();
            
            if (body.templateIndex === undefined) {
                return c.json({ success: false, error: 'templateIndex required' }, 400);
            }

            const workflow = service.createFromTemplate(body.templateIndex, body.name);

            return c.json({
                success: true,
                workflow,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * GET /api/workflows/:id
     * Get a specific workflow
     */
    app.get('/:id', (c) => {
        try {
            const id = c.req.param('id');
            const workflow = service.getWorkflow(id);
            
            if (!workflow) {
                return c.json({ success: false, error: 'Workflow not found' }, 404);
            }

            return c.json({
                success: true,
                workflow,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * PUT /api/workflows/:id
     * Update a workflow
     */
    app.put('/:id', async (c) => {
        try {
            const id = c.req.param('id');
            const body = await c.req.json();

            const workflow = service.updateWorkflow(id, body);

            return c.json({
                success: true,
                workflow,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const status = message.includes('not found') ? 404 : 500;
            
            return c.json({
                success: false,
                error: message,
            }, status);
        }
    });

    /**
     * DELETE /api/workflows/:id
     * Delete a workflow
     */
    app.delete('/:id', (c) => {
        try {
            const id = c.req.param('id');
            const deleted = service.deleteWorkflow(id);

            if (!deleted) {
                return c.json({ success: false, error: 'Workflow not found' }, 404);
            }

            return c.json({ success: true });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    // ========================================
    // Workflow Execution
    // ========================================

    /**
     * POST /api/workflows/:id/execute
     * Execute a workflow
     */
    app.post('/:id/execute', async (c) => {
        try {
            const id = c.req.param('id');
            const body = await c.req.json().catch(() => ({}));

            const execution = await service.executeWorkflow(id, body.input, {
                triggeredBy: body.triggeredBy || 'api',
                triggerData: body.triggerData,
            });

            return c.json({
                success: true,
                execution,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const status = message.includes('not found') ? 404 : 
                          message.includes('not active') ? 400 : 500;
            
            return c.json({
                success: false,
                error: message,
            }, status);
        }
    });

    /**
     * POST /api/workflows/:id/activate
     * Activate a workflow (set status to active)
     */
    app.post('/:id/activate', async (c) => {
        try {
            const id = c.req.param('id');
            const workflow = service.updateWorkflow(id, { status: 'active' });

            return c.json({
                success: true,
                workflow,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return c.json({
                success: false,
                error: message,
            }, message.includes('not found') ? 404 : 500);
        }
    });

    /**
     * POST /api/workflows/:id/deactivate
     * Deactivate a workflow (set status to paused)
     */
    app.post('/:id/deactivate', async (c) => {
        try {
            const id = c.req.param('id');
            const workflow = service.updateWorkflow(id, { status: 'paused' });

            return c.json({
                success: true,
                workflow,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return c.json({
                success: false,
                error: message,
            }, message.includes('not found') ? 404 : 500);
        }
    });

    // ========================================
    // Step Management
    // ========================================

    /**
     * POST /api/workflows/:id/steps
     * Add a step to workflow
     */
    app.post('/:id/steps', async (c) => {
        try {
            const id = c.req.param('id');
            const body = await c.req.json();
            
            if (!body.name || !body.type) {
                return c.json({ success: false, error: 'name and type required' }, 400);
            }

            const step = service.addStep(id, {
                name: body.name,
                type: body.type,
                config: body.config || {},
                inputMapping: body.inputMapping,
                outputVar: body.outputVar,
                onError: body.onError,
                retryCount: body.retryCount,
                retryDelayMs: body.retryDelayMs,
                errorGoto: body.errorGoto,
                nextStep: body.nextStep,
                description: body.description,
                timeout: body.timeout,
                enabled: body.enabled,
            });

            return c.json({
                success: true,
                step,
            }, 201);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return c.json({
                success: false,
                error: message,
            }, message.includes('not found') ? 404 : 500);
        }
    });

    /**
     * PUT /api/workflows/:id/steps/:stepId
     * Update a step
     */
    app.put('/:id/steps/:stepId', async (c) => {
        try {
            const id = c.req.param('id');
            const stepId = c.req.param('stepId');
            const body = await c.req.json();

            const step = service.updateStep(id, stepId, body);

            return c.json({
                success: true,
                step,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return c.json({
                success: false,
                error: message,
            }, message.includes('not found') ? 404 : 500);
        }
    });

    /**
     * DELETE /api/workflows/:id/steps/:stepId
     * Remove a step
     */
    app.delete('/:id/steps/:stepId', (c) => {
        try {
            const id = c.req.param('id');
            const stepId = c.req.param('stepId');

            const removed = service.removeStep(id, stepId);

            if (!removed) {
                return c.json({ success: false, error: 'Step not found' }, 404);
            }

            return c.json({ success: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return c.json({
                success: false,
                error: message,
            }, message.includes('not found') ? 404 : 500);
        }
    });

    /**
     * POST /api/workflows/:id/steps/reorder
     * Reorder steps
     */
    app.post('/:id/steps/reorder', async (c) => {
        try {
            const id = c.req.param('id');
            const body = await c.req.json();
            
            if (!body.stepIds || !Array.isArray(body.stepIds)) {
                return c.json({ success: false, error: 'stepIds array required' }, 400);
            }

            service.reorderSteps(id, body.stepIds);
            const workflow = service.getWorkflow(id);

            return c.json({
                success: true,
                workflow,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return c.json({
                success: false,
                error: message,
            }, message.includes('not found') ? 404 : 500);
        }
    });

    // ========================================
    // Executions
    // ========================================

    /**
     * GET /api/workflows/executions
     * List execution history
     */
    app.get('/executions', (c) => {
        try {
            const workflowId = c.req.query('workflow');
            const status = c.req.query('status') as ExecutionStatus | undefined;
            const limit = parseInt(c.req.query('limit') || '100');

            const executions = service.getExecutionHistory({
                workflowId,
                status,
                limit,
            });

            return c.json({
                success: true,
                executions,
                count: executions.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * GET /api/workflows/executions/active
     * Get active executions
     */
    app.get('/executions/active', (c) => {
        try {
            const executions = service.getActiveExecutions();

            return c.json({
                success: true,
                executions,
                count: executions.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * GET /api/workflows/executions/:id
     * Get execution details
     */
    app.get('/executions/:id', (c) => {
        try {
            const id = c.req.param('id');
            const execution = service.getExecution(id);
            
            if (!execution) {
                return c.json({ success: false, error: 'Execution not found' }, 404);
            }

            return c.json({
                success: true,
                execution,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /api/workflows/executions/:id/cancel
     * Cancel an execution
     */
    app.post('/executions/:id/cancel', (c) => {
        try {
            const id = c.req.param('id');
            const cancelled = service.cancelExecution(id);
            
            if (!cancelled) {
                return c.json({ success: false, error: 'Execution not found or not running' }, 404);
            }

            return c.json({ success: true });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /api/workflows/executions/:id/pause
     * Pause an execution
     */
    app.post('/executions/:id/pause', (c) => {
        try {
            const id = c.req.param('id');
            const paused = service.pauseExecution(id);
            
            if (!paused) {
                return c.json({ success: false, error: 'Execution not found or not running' }, 404);
            }

            return c.json({ success: true });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /api/workflows/save
     * Force save workflows to disk
     */
    app.post('/save', (c) => {
        try {
            service.saveToDisk();
            return c.json({
                success: true,
                message: 'Workflows saved to disk',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    return app;
}
