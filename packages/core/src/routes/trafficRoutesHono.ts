import { Hono } from 'hono';
import { TrafficInspectionService } from '../services/TrafficInspectionService.js';

export function createTrafficRoutes(): Hono {
  const app = new Hono();
  const service = TrafficInspectionService.getInstance();

  app.get('/', (c) => {
    const serverId = c.req.query('serverId');
    const method = c.req.query('method');
    const direction = c.req.query('direction') as 'request' | 'response' | 'notification' | undefined;
    
    const filter = {
      serverId,
      method,
      direction
    };

    const frames = service.getFrames(filter);
    return c.json({ frames });
  });

  app.delete('/', (c) => {
    service.clear();
    return c.json({ success: true });
  });

  return app;
}
