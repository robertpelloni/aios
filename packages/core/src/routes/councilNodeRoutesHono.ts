import { Hono } from 'hono';
import { CouncilNodeManager, type CouncilNode } from '../managers/CouncilNodeManager.js';
import { RbacService, type Permission } from '../services/RbacService.js';

type Variables = {
  userRole: string;
};

export function createCouncilNodeRoutes(): Hono<{ Variables: Variables }> {
  const app = new Hono<{ Variables: Variables }>();
  const nodeManager = CouncilNodeManager.getInstance();

  app.get('/', (c) => {
    return c.json({ nodes: nodeManager.getAllNodes() });
  });

  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const node = nodeManager.getNode(id);
    if (!node) return c.json({ error: 'Node not found' }, 404);
    return c.json({ node });
  });

  app.post('/', async (c) => {
    const body = await c.req.json<Omit<CouncilNode, 'id' | 'status'>>();
    if (!body.name || !body.url) {
      return c.json({ error: 'name and url are required' }, 400);
    }
    const node = nodeManager.addNode(body);
    return c.json({ success: true, node }, 201);
  });

  app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json<Partial<Omit<CouncilNode, 'id'>>>();
    const node = nodeManager.updateNode(id, updates);
    if (!node) return c.json({ error: 'Node not found' }, 404);
    return c.json({ success: true, node });
  });

  app.delete('/:id', (c) => {
    const id = c.req.param('id');
    const success = nodeManager.removeNode(id);
    if (!success) return c.json({ error: 'Node not found' }, 404);
    return c.json({ success: true });
  });

  app.post('/:id/ping', async (c) => {
    const id = c.req.param('id');
    const online = await nodeManager.pingNode(id);
    return c.json({ online });
  });

  app.post('/:id/discover', async (c) => {
    const id = c.req.param('id');
    const supervisors = await nodeManager.discoverRemoteSupervisors(id);
    return c.json({ supervisors });
  });

  return app;
}
