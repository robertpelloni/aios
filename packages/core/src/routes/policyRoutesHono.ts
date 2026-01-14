import { Hono } from 'hono';
import { PolicyService, type PolicyContext } from '../services/PolicyService.js';
import { RbacService, type UserRole, type Permission } from '../services/RbacService.js';
import { AuditService } from '../services/AuditService.js';

type Variables = {
    userRole: UserRole;
};

export function createPolicyRoutes(policyService: PolicyService): Hono<{ Variables: Variables }> {
    const app = new Hono<{ Variables: Variables }>();
    const audit = AuditService.getInstance();

    // List all policies
    app.get('/', async (c) => {
        return c.json({ policies: policyService.getAllPolicies() });
    });

    // Get policy stats
    app.get('/stats', async (c) => {
        return c.json(policyService.getStats());
    });

    // Get policy templates
    app.get('/templates', async (c) => {
        return c.json({ templates: policyService.getTemplates() });
    });

    // Create a new policy
    app.post('/', async (c) => {
        const { name, rules, description, priority, enabled } = await c.req.json();
        if (!name || !rules) {
            return c.json({ error: 'Name and rules are required' }, 400);
        }

        try {
            const policy = policyService.createPolicy(name, rules, { description, priority, enabled });
            const actor = c.get('userRole') || 'system';
            audit.log({
                type: 'admin.action',
                actor,
                resource: `policy:${policy.id}`,
                action: 'create',
                outcome: 'success',
                metadata: { name }
            });
            return c.json({ success: true, policy });
        } catch (e) {
            return c.json({ error: (e as Error).message }, 400);
        }
    });

    // Apply a template
    app.post('/apply-template', async (c) => {
        const { templateName, policyName } = await c.req.json();
        if (!templateName) {
            return c.json({ error: 'templateName is required' }, 400);
        }

        try {
            const policy = policyService.applyTemplate(templateName, policyName);
            const actor = c.get('userRole') || 'system';
            audit.log({
                type: 'admin.action',
                actor,
                resource: `policy:${policy.id}`,
                action: 'apply_template',
                outcome: 'success',
                metadata: { templateName }
            });
            return c.json({ success: true, policy });
        } catch (e) {
            return c.json({ error: (e as Error).message }, 400);
        }
    });

    // Delete a policy
    app.delete('/:id', async (c) => {
        const id = c.req.param('id');
        const success = policyService.deletePolicy(id);
        if (!success) {
            return c.json({ error: 'Policy not found' }, 404);
        }

        const actor = c.get('userRole') || 'system';
        audit.log({
            type: 'admin.action',
            actor,
            resource: `policy:${id}`,
            action: 'delete',
            outcome: 'success'
        });

        return c.json({ success: true });
    });

    // Evaluate a context (dry-run)
    app.post('/evaluate', async (c) => {
        const context = await c.req.json<PolicyContext>();
        const result = policyService.evaluate(context);
        return c.json(result);
    });

    return app;
}
