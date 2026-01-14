import { Hono } from 'hono';
import { GpuAccelerationService } from '../services/GpuAccelerationService.js';

export function createGpuRoutes(): Hono {
  const app = new Hono();
  const service = GpuAccelerationService.getInstance();

  app.get('/status', (c) => {
    return c.json(service.getStatus());
  });

  app.post('/load-model', async (c) => {
    const { modelPath } = await c.req.json();
    if (!modelPath) return c.json({ error: 'modelPath required' }, 400);
    const success = await service.loadLocalModel(modelPath);
    return c.json({ success });
  });

  return app;
}
