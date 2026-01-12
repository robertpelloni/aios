/**
 * AIOS Scheduler API Routes (Hono)
 * 
 * REST API endpoints for scheduled task management.
 * 
 * Endpoints:
 * - GET    /api/scheduler/tasks    - List all scheduled tasks
 * - POST   /api/scheduler/tasks    - Create a new scheduled task
 * - GET    /api/scheduler/tasks/:id - Get task details
 * - PUT    /api/scheduler/tasks/:id - Update task
 * - DELETE /api/scheduler/tasks/:id - Delete task
 * - POST   /api/scheduler/tasks/:id/enable - Enable task
 * - POST   /api/scheduler/tasks/:id/disable - Disable task
 * - POST   /api/scheduler/start    - Start the scheduler
 * 
 * @module routes/schedulerRoutesHono
 */

import { Hono } from 'hono';
import { SchedulerManager } from '../managers/SchedulerManager.js';

// ============================================
// Route Factory
// ============================================

export function createSchedulerRoutes(schedulerManager: SchedulerManager): Hono {
    const app = new Hono();

    // ========================================
    // Task Management
    // ========================================

    /**
     * GET /api/scheduler/tasks
     * List all scheduled tasks
     */
    app.get('/tasks', (c) => {
        try {
            const tasks = schedulerManager.getTasks();
            return c.json({
                success: true,
                tasks,
                count: tasks.length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /api/scheduler/tasks
     * Create a new scheduled task
     */
    app.post('/tasks', async (c) => {
        try {
            const body = await c.req.json();
            
            if (!body.name) {
                return c.json({ success: false, error: 'name required' }, 400);
            }
            if (!body.cron) {
                return c.json({ success: false, error: 'cron expression required' }, 400);
            }
            if (!body.type || !['tool', 'agent'].includes(body.type)) {
                return c.json({ success: false, error: 'type must be "tool" or "agent"' }, 400);
            }
            if (!body.target) {
                return c.json({ success: false, error: 'target required' }, 400);
            }

            const taskId = schedulerManager.registerTask({
                name: body.name,
                cron: body.cron,
                type: body.type,
                target: body.target,
                args: body.args || {},
                enabled: body.enabled !== false,
            });

            return c.json({
                success: true,
                taskId,
                message: `Task "${body.name}" created`,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * GET /api/scheduler/tasks/:id
     * Get task details
     */
    app.get('/tasks/:id', (c) => {
        try {
            const id = c.req.param('id');
            const tasks = schedulerManager.getTasks();
            const task = tasks.find(t => t.id === id);
            
            if (!task) {
                return c.json({ success: false, error: 'Task not found' }, 404);
            }

            return c.json({
                success: true,
                task,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * DELETE /api/scheduler/tasks/:id
     * Delete a scheduled task
     */
    app.delete('/tasks/:id', (c) => {
        try {
            const id = c.req.param('id');
            
            // Check if task exists
            const tasks = schedulerManager.getTasks();
            const task = tasks.find(t => t.id === id);
            
            if (!task) {
                return c.json({ success: false, error: 'Task not found' }, 404);
            }

            schedulerManager.removeTask(id);

            return c.json({
                success: true,
                message: `Task "${task.name}" deleted`,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /api/scheduler/start
     * Start the scheduler (activates all enabled tasks)
     */
    app.post('/start', (c) => {
        try {
            schedulerManager.start();
            return c.json({
                success: true,
                message: 'Scheduler started',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * GET /api/scheduler/cron/validate
     * Validate a cron expression
     */
    app.get('/cron/validate', (c) => {
        try {
            const expression = c.req.query('expression');
            
            if (!expression) {
                return c.json({ success: false, error: 'expression query param required' }, 400);
            }

            // Basic cron validation - check format
            const parts = expression.split(' ');
            const isValid = parts.length >= 5 && parts.length <= 6;

            return c.json({
                success: true,
                valid: isValid,
                expression,
                parts: parts.length,
                format: parts.length === 5 
                    ? 'minute hour day month weekday' 
                    : 'second minute hour day month weekday',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * GET /api/scheduler/cron/examples
     * Get common cron expression examples
     */
    app.get('/cron/examples', (c) => {
        return c.json({
            success: true,
            examples: [
                { expression: '* * * * *', description: 'Every minute' },
                { expression: '*/5 * * * *', description: 'Every 5 minutes' },
                { expression: '0 * * * *', description: 'Every hour' },
                { expression: '0 */2 * * *', description: 'Every 2 hours' },
                { expression: '0 0 * * *', description: 'Every day at midnight' },
                { expression: '0 9 * * *', description: 'Every day at 9 AM' },
                { expression: '0 9 * * 1-5', description: 'Weekdays at 9 AM' },
                { expression: '0 0 * * 0', description: 'Every Sunday at midnight' },
                { expression: '0 0 1 * *', description: 'First day of every month' },
                { expression: '0 0 1 1 *', description: 'January 1st at midnight' },
            ],
        });
    });

    return app;
}
