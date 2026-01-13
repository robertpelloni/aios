import { Hono } from 'hono';
import { GitWorktreeManager } from '../managers/GitWorktreeManager.js';

export function createGitWorktreeRoutes(config: { baseDir: string }): Hono {
  const app = new Hono();
  const manager = new GitWorktreeManager(config);

  app.get('/', (c) => {
    return c.json({ worktrees: manager.listWorktrees() });
  });

  app.post('/', async (c) => {
    const { agentId } = await c.req.json<{ agentId?: string }>();
    try {
      const worktree = await manager.createWorktree(agentId);
      return c.json(worktree);
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500);
    }
  });

  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const worktree = manager.getWorktree(id);
    if (!worktree) return c.json({ error: 'Not found' }, 404);
    return c.json(worktree);
  });

  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    await manager.removeWorktree(id);
    return c.json({ success: true });
  });

  app.post('/:id/sync', async (c) => {
    const id = c.req.param('id');
    const result = await manager.syncWithMain(id);
    return c.json(result);
  });

  return app;
}
