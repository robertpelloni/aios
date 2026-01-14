import { Hono } from 'hono';
import { ToolInventoryService } from '../services/ToolInventoryService.js';

export function createInventoryRoutes(): Hono {
  const app = new Hono();
  const service = ToolInventoryService.getInstance();

  app.get('/', (c) => {
    return c.json({ tools: service.getAllTools() });
  });

  app.post('/check', async (c) => {
    const { id } = await c.req.json();
    if (id) {
      await service.checkStatus(id);
    } else {
      await service.checkAll();
    }
    return c.json({ success: true, tools: service.getAllTools() });
  });

  return app;
}
