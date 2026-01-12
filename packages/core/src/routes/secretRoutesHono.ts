/**
 * @module routes/secretRoutesHono
 */

import { Hono } from 'hono';
import {
    getSecretService,
    type SecretType,
    type SecretScope,
} from '../services/SecretService.js';

export function createSecretRoutes(): Hono {
    const app = new Hono();
    const service = getSecretService();

    app.post('/secrets', async (c) => {
        try {
            const body = await c.req.json();
            const actorId = c.req.header('x-actor-id') || 'system';

            if (!body.name || !body.value || !body.type || !body.scope) {
                return c.json({
                    success: false,
                    error: 'name, value, type, and scope are required'
                }, 400);
            }

            const secret = await service.createSecret({
                name: body.name,
                value: body.value,
                type: body.type as SecretType,
                scope: body.scope as SecretScope,
                scopeId: body.scopeId,
                description: body.description,
                rotationPolicy: body.rotationPolicy,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
                tags: body.tags,
                metadata: body.metadata,
                createdBy: actorId,
            });

            return c.json({ success: true, secret }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create secret'
            }, 400);
        }
    });

    app.get('/secrets', async (c) => {
        try {
            const scope = c.req.query('scope') as SecretScope | undefined;
            const scopeId = c.req.query('scopeId');
            const type = c.req.query('type') as SecretType | undefined;
            const tags = c.req.query('tags')?.split(',');
            const includeExpired = c.req.query('includeExpired') === 'true';

            const secrets = service.listSecrets({ scope, scopeId, type, tags, includeExpired });
            return c.json({ success: true, secrets, count: secrets.length });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list secrets'
            }, 500);
        }
    });

    app.get('/secrets/:secretId', async (c) => {
        try {
            const secretId = c.req.param('secretId');
            const secret = service.getSecretMetadata(secretId);

            if (!secret) {
                return c.json({ success: false, error: 'Secret not found' }, 404);
            }

            return c.json({ success: true, secret });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get secret'
            }, 500);
        }
    });

    app.get('/secrets/:secretId/value', async (c) => {
        try {
            const secretId = c.req.param('secretId');
            const actorId = c.req.header('x-actor-id') || 'system';
            const actorType = (c.req.header('x-actor-type') || 'user') as 'user' | 'service' | 'system';

            const value = await service.getSecret(secretId, actorId, actorType);

            if (value === null) {
                return c.json({ success: false, error: 'Secret not found or expired' }, 404);
            }

            return c.json({ success: true, value });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get secret value'
            }, 500);
        }
    });

    app.put('/secrets/:secretId', async (c) => {
        try {
            const secretId = c.req.param('secretId');
            const body = await c.req.json();
            const actorId = c.req.header('x-actor-id') || 'system';

            if (!body.value) {
                return c.json({ success: false, error: 'value is required' }, 400);
            }

            const secret = await service.updateSecret(secretId, body.value, actorId);

            if (!secret) {
                return c.json({ success: false, error: 'Secret not found' }, 404);
            }

            return c.json({ success: true, secret });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update secret'
            }, 400);
        }
    });

    app.post('/secrets/:secretId/rotate', async (c) => {
        try {
            const secretId = c.req.param('secretId');
            const body = await c.req.json();
            const actorId = c.req.header('x-actor-id') || 'system';

            if (!body.value) {
                return c.json({ success: false, error: 'value is required' }, 400);
            }

            const secret = await service.rotateSecret(secretId, body.value, actorId);

            if (!secret) {
                return c.json({ success: false, error: 'Secret not found' }, 404);
            }

            return c.json({ success: true, secret });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to rotate secret'
            }, 500);
        }
    });

    app.delete('/secrets/:secretId', async (c) => {
        try {
            const secretId = c.req.param('secretId');
            const actorId = c.req.header('x-actor-id') || 'system';

            const deleted = await service.deleteSecret(secretId, actorId);

            if (!deleted) {
                return c.json({ success: false, error: 'Secret not found' }, 404);
            }

            return c.json({ success: true, message: 'Secret deleted' });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete secret'
            }, 500);
        }
    });

    app.get('/secrets/:secretId/access-log', async (c) => {
        try {
            const secretId = c.req.param('secretId');
            const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;

            const log = service.getAccessLog(secretId, limit);
            return c.json({ success: true, log, count: log.length });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get access log'
            }, 500);
        }
    });

    app.get('/secrets/by-name/:name', async (c) => {
        try {
            const name = c.req.param('name');
            const scope = c.req.query('scope') as SecretScope;
            const scopeId = c.req.query('scopeId');
            const actorId = c.req.header('x-actor-id') || 'system';
            const actorType = (c.req.header('x-actor-type') || 'user') as 'user' | 'service' | 'system';

            if (!scope) {
                return c.json({ success: false, error: 'scope query param is required' }, 400);
            }

            const value = await service.getSecretByName(name, scope, scopeId, actorId, actorType);

            if (value === null) {
                return c.json({ success: false, error: 'Secret not found or expired' }, 404);
            }

            return c.json({ success: true, value });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get secret'
            }, 500);
        }
    });

    app.get('/expiring', async (c) => {
        try {
            const withinDays = c.req.query('days') ? parseInt(c.req.query('days')!) : 30;
            const secrets = service.getExpiringSecrets(withinDays);
            return c.json({ success: true, secrets, count: secrets.length });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get expiring secrets'
            }, 500);
        }
    });

    app.get('/needs-rotation', async (c) => {
        try {
            const secrets = service.getSecretsNeedingRotation();
            return c.json({ success: true, secrets, count: secrets.length });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get secrets needing rotation'
            }, 500);
        }
    });

    app.post('/resolve', async (c) => {
        try {
            const body = await c.req.json();
            const actorId = c.req.header('x-actor-id') || 'system';
            const actorType = (c.req.header('x-actor-type') || 'service') as 'user' | 'service' | 'system';

            if (!Array.isArray(body.refs)) {
                return c.json({ success: false, error: 'refs array is required' }, 400);
            }

            const resolved = await service.bulkResolve(body.refs, actorId, actorType);
            return c.json({ success: true, resolved: Object.fromEntries(resolved) });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to resolve secrets'
            }, 500);
        }
    });

    app.get('/env/:scope', async (c) => {
        try {
            const scope = c.req.param('scope') as SecretScope;
            const scopeId = c.req.query('scopeId');
            const actorId = c.req.header('x-actor-id') || 'system';

            const env = await service.resolveEnvVars(scope, scopeId, actorId);
            return c.json({ success: true, env, count: Object.keys(env).length });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to resolve env vars'
            }, 500);
        }
    });

    app.get('/health', async (c) => {
        const secrets = service.listSecrets();
        const expiring = service.getExpiringSecrets(7);
        const needsRotation = service.getSecretsNeedingRotation();

        return c.json({
            success: true,
            status: 'healthy',
            totalSecrets: secrets.length,
            expiringSoon: expiring.length,
            needsRotation: needsRotation.length,
        });
    });

    return app;
}
