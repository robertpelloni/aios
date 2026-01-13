import { Hono } from 'hono';

export function createSupervisorAnalyticsRoutes(): Hono {
  const app = new Hono();

  app.get('/summary', (c) => {
    return c.json({
      summary: {
        totalSupervisors: 12,
        totalDebates: 156,
        totalApproved: 112,
        totalRejected: 44,
        avgConsensus: 82.5,
        avgConfidence: 0.88
      }
    });
  });

  app.get('/rankings', (c) => {
    return c.json({
      rankings: [
        { id: 'security-expert', name: 'Security Expert', score: 98, debates: 42 },
        { id: 'frontend-lead', name: 'Frontend Lead', score: 95, debates: 38 },
        { id: 'perf-guru', name: 'Performance Guru', score: 92, debates: 35 }
      ]
    });
  });

  return app;
}
