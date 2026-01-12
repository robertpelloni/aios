/**
 * AIOS Unified Profile Routes (Hono)
 * 
 * REST API for managing user profiles, API profiles, and CLI proxy variants.
 * Provides a unified interface for all profile types.
 * 
 * Endpoints:
 * - GET /all - List all profiles (accounts, API, cliproxy)
 * - GET /stats - Get profile statistics
 * - GET /default - Get default profile
 * - PUT /default - Set default profile
 * - DELETE /default - Clear default profile
 * 
 * Account Profiles:
 * - GET /accounts - List account profiles
 * - POST /accounts - Create account profile
 * - DELETE /accounts/:name - Delete account profile
 * 
 * API Profiles:
 * - GET /api-profiles - List API profiles
 * - POST /api-profiles - Create API profile
 * - DELETE /api-profiles/:name - Delete API profile
 * - PUT /api-profiles/:name/models - Set model mapping
 * 
 * CLI Proxy Variants:
 * - GET /cliproxy-variants - List CLI proxy variants
 * - POST /cliproxy-variants - Create CLI proxy variant
 * - DELETE /cliproxy-variants/:name - Delete CLI proxy variant
 * 
 * Model Mappings:
 * - GET /models/:provider - Get model mapping for provider
 * 
 * Migration:
 * - POST /migrate - Migrate from legacy to unified config
 * 
 * @module routes/profileRoutesHono
 */

import { Hono } from 'hono';
import { getUnifiedProfileManager } from '../managers/UnifiedProfileManager.js';

export function createProfileRoutes() {
    const router = new Hono();
    const manager = getUnifiedProfileManager();

    // ============================================
    // General Profile Operations
    // ============================================

    /**
     * GET /all - List all profiles
     */
    router.get('/all', (c) => {
        try {
            const profiles = manager.listAllProfiles();
            const stats = manager.getStats();
            
            return c.json({
                success: true,
                profiles,
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
     * GET /stats - Get profile statistics
     */
    router.get('/stats', (c) => {
        try {
            const stats = manager.getStats();
            
            return c.json({
                success: true,
                ...stats,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * GET /:name - Get profile by name
     */
    router.get('/:name', (c) => {
        try {
            const name = c.req.param('name');
            
            // Skip reserved paths
            if (['all', 'stats', 'default', 'accounts', 'api-profiles', 'cliproxy-variants', 'models', 'migrate'].includes(name)) {
                return c.json({ success: false, error: 'Use specific endpoint' }, 400);
            }
            
            const profile = manager.getProfile(name);
            
            if (!profile) {
                return c.json({
                    success: false,
                    error: 'Profile not found',
                }, 404);
            }
            
            const defaultProfile = manager.getDefault();
            
            return c.json({
                success: true,
                name,
                profile,
                isDefault: name === defaultProfile,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /:name/touch - Update lastUsed timestamp
     */
    router.post('/:name/touch', (c) => {
        try {
            const name = c.req.param('name');
            manager.touchProfile(name);
            
            return c.json({
                success: true,
                message: 'Profile touched',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    // ============================================
    // Default Profile Management
    // ============================================

    /**
     * GET /default - Get default profile
     */
    router.get('/default', (c) => {
        try {
            const defaultProfile = manager.getDefault();
            
            if (!defaultProfile) {
                return c.json({
                    success: true,
                    default: null,
                    message: 'No default profile set',
                });
            }
            
            const profile = manager.getProfile(defaultProfile);
            
            return c.json({
                success: true,
                default: defaultProfile,
                profile,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * PUT /default - Set default profile
     */
    router.put('/default', async (c) => {
        try {
            const body = await c.req.json();
            const { name } = body;
            
            if (!name) {
                return c.json({
                    success: false,
                    error: 'name is required',
                }, 400);
            }
            
            manager.setDefault(name);
            
            return c.json({
                success: true,
                default: name,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * DELETE /default - Clear default profile
     */
    router.delete('/default', (c) => {
        try {
            manager.clearDefault();
            
            return c.json({
                success: true,
                message: 'Default profile cleared',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    // ============================================
    // Account Profiles
    // ============================================

    /**
     * GET /accounts - List account profiles
     */
    router.get('/accounts', (c) => {
        try {
            const accounts = manager.getAccounts();
            
            return c.json({
                success: true,
                accounts,
                total: Object.keys(accounts).length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /accounts - Create account profile
     */
    router.post('/accounts', async (c) => {
        try {
            const body = await c.req.json();
            const { name, email, displayName } = body;
            
            if (!name) {
                return c.json({
                    success: false,
                    error: 'name is required',
                }, 400);
            }
            
            manager.createAccount(name, { email, displayName });
            
            return c.json({
                success: true,
                message: `Account ${name} created`,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * DELETE /accounts/:name - Delete account profile
     */
    router.delete('/accounts/:name', (c) => {
        try {
            const name = c.req.param('name');
            manager.deleteAccount(name);
            
            return c.json({
                success: true,
                message: `Account ${name} deleted`,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    // ============================================
    // API Profiles
    // ============================================

    /**
     * GET /api-profiles - List API profiles
     */
    router.get('/api-profiles', (c) => {
        try {
            const profiles = manager.getApiProfiles();
            
            return c.json({
                success: true,
                profiles,
                total: Object.keys(profiles).length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /api-profiles - Create API profile
     */
    router.post('/api-profiles', async (c) => {
        try {
            const body = await c.req.json();
            const { name, provider, settings, models } = body;
            
            if (!name || !provider) {
                return c.json({
                    success: false,
                    error: 'name and provider are required',
                }, 400);
            }
            
            manager.createApiProfile(name, { provider, settings, models });
            
            return c.json({
                success: true,
                message: `API profile ${name} created`,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * DELETE /api-profiles/:name - Delete API profile
     */
    router.delete('/api-profiles/:name', (c) => {
        try {
            const name = c.req.param('name');
            manager.deleteApiProfile(name);
            
            return c.json({
                success: true,
                message: `API profile ${name} deleted`,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * PUT /api-profiles/:name/models - Set model mapping for API profile
     */
    router.put('/api-profiles/:name/models', async (c) => {
        try {
            const name = c.req.param('name');
            const body = await c.req.json();
            const { models } = body;
            
            if (!models || !models.default || !models.opus || !models.sonnet || !models.haiku) {
                return c.json({
                    success: false,
                    error: 'models object with default, opus, sonnet, haiku is required',
                }, 400);
            }
            
            manager.setProfileModelMapping(name, models);
            
            return c.json({
                success: true,
                message: `Model mapping updated for ${name}`,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    // ============================================
    // CLI Proxy Variants
    // ============================================

    /**
     * GET /cliproxy-variants - List CLI proxy variants
     */
    router.get('/cliproxy-variants', (c) => {
        try {
            const variants = manager.getCliProxyVariants();
            
            return c.json({
                success: true,
                variants,
                total: Object.keys(variants).length,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /cliproxy-variants - Create CLI proxy variant
     */
    router.post('/cliproxy-variants', async (c) => {
        try {
            const body = await c.req.json();
            const { name, provider, settings, port } = body;
            
            if (!name || !provider) {
                return c.json({
                    success: false,
                    error: 'name and provider are required',
                }, 400);
            }
            
            manager.createCliProxyVariant(name, { provider, settings, port });
            
            return c.json({
                success: true,
                message: `CLI proxy variant ${name} created`,
            }, 201);
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * DELETE /cliproxy-variants/:name - Delete CLI proxy variant
     */
    router.delete('/cliproxy-variants/:name', (c) => {
        try {
            const name = c.req.param('name');
            manager.deleteCliProxyVariant(name);
            
            return c.json({
                success: true,
                message: `CLI proxy variant ${name} deleted`,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    // ============================================
    // Model Mappings
    // ============================================

    /**
     * GET /models/:provider - Get model mapping for provider
     */
    router.get('/models/:provider', (c) => {
        try {
            const provider = c.req.param('provider');
            const mapping = manager.getModelMapping(provider);
            
            return c.json({
                success: true,
                provider,
                mapping,
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    // ============================================
    // Migration
    // ============================================

    /**
     * GET /config-mode - Get current config mode
     */
    router.get('/config-mode', (c) => {
        try {
            const isUnified = manager.isUnifiedMode();
            
            return c.json({
                success: true,
                mode: isUnified ? 'unified' : 'legacy',
                message: isUnified 
                    ? 'Using unified YAML config (config.yaml)' 
                    : 'Using legacy JSON config (config.json, profiles.json)',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    /**
     * POST /migrate - Migrate from legacy to unified config
     */
    router.post('/migrate', async (c) => {
        try {
            if (manager.isUnifiedMode()) {
                return c.json({
                    success: false,
                    error: 'Already using unified config',
                }, 400);
            }
            
            await manager.migrateToUnified();
            
            return c.json({
                success: true,
                message: 'Migration to unified config completed',
            });
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
        }
    });

    return router;
}
