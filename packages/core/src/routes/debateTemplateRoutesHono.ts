import { Hono } from 'hono';

export function createDebateTemplateRoutes(): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    return c.json({
      templates: [
        {
          id: 'security-review',
          name: 'Security Review',
          description: 'Intense security audit by multiple experts',
          supervisors: ['security-1', 'security-2', 'audit-bot']
        },
        {
          id: 'design-critique',
          name: 'Architecture Critique',
          description: 'High-level architectural evaluation',
          supervisors: ['architect-1', 'lead-dev', 'senior-eng']
        }
      ]
    });
  });

  return app;
}
