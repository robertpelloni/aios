import { Hono } from 'hono';
import { getOpenApiService } from '../services/OpenApiService.js';

export function createOpenApiRoutes(): Hono {
  const app = new Hono();
  const service = getOpenApiService();

  app.get('/spec.json', (c) => {
    return c.json(service.getSpec());
  });

  app.get('/ui', (c) => {
    const specUrl = '/api/openapi/spec.json';
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AIOS API Documentation</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              url: '${specUrl}',
              dom_id: '#swagger-ui',
            });
          };
        </script>
      </body>
      </html>
    `;
    return c.html(html);
  });

  return app;
}
