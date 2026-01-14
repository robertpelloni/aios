import { Hono } from 'hono';
import { DataResidencyService, type StorageProvider } from '../services/DataResidencyService.js';

export function createDataResidencyRoutes(): Hono {
  const app = new Hono();
  const service = DataResidencyService.getInstance();

  app.get('/policies', (c) => {
    return c.json({ policies: service.getPolicies() });
  });

  app.put('/policies/:dataType', async (c) => {
    const dataType = c.req.param('dataType');
    const updates = await c.req.json();
    try {
      const updated = service.updatePolicy(dataType, updates);
      return c.json({ success: true, policy: updated });
    } catch (e: any) {
      return c.json({ error: e.message }, 404);
    }
  });

  app.get('/providers', (c) => {
    const providers: StorageProvider[] = ['local', 's3', 'azure-blob', 'mongodb', 'ipfs'];
    return c.json({ providers });
  });

  return app;
}
