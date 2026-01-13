import { Hono } from 'hono';
import { SupervisorPluginManager } from '../managers/SupervisorPluginManager.js';

export function createSupervisorPluginRoutes(): Hono {
  const app = new Hono();
  const manager = SupervisorPluginManager.getInstance();

  app.get('/', (c) => {
    return c.json({ plugins: manager.listPlugins() });
  });

  app.get('/stats', (c) => {
    return c.json(manager.getStats());
  });

  app.post('/register', async (c) => {
    const { name, code, options } = await c.req.json<{ name: string; code: string; options?: any }>();
    
    // In a real implementation, we'd need a safe way to evaluate the code
    // For now, let's assume registerInlinePlugin takes a chat function
    return c.json({ error: 'Dynamic code registration not fully implemented' }, 501);
  });

  app.post('/:id/enable', (c) => {
    const id = c.req.param('id');
    manager.enablePlugin(id);
    return c.json({ success: true });
  });

  app.post('/:id/disable', (c) => {
    const id = c.req.param('id');
    manager.disablePlugin(id);
    return c.json({ success: true });
  });

  return app;
}
