import { Hono } from 'hono';
import { BatchProcessingService } from '../services/BatchProcessingService.js';

export function createBatchRoutes(): Hono {
  const app = new Hono();
  const service = BatchProcessingService.getInstance();

  app.get('/', (c) => {
    return c.json({ batches: service.listBatches() });
  });

  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const batch = service.getBatch(id);
    if (!batch) return c.json({ error: 'Batch not found' }, 404);
    return c.json({ batch });
  });

  app.post('/', async (c) => {
    const { agentName, tasks } = await c.req.json();
    if (!agentName || !tasks || !Array.isArray(tasks)) {
      return c.json({ error: 'agentName and tasks array required' }, 400);
    }
    const id = await service.createBatch(agentName, tasks);
    return c.json({ id, status: 'pending' }, 201);
  });

  return app;
}
