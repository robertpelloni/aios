import { describe, test, expect } from 'bun:test';

function makeServer() {
  const endpoint = { apiKeyId: 'k1' };

  const fakeDb = {
    validateApiKey: (k: string) => (k === 'good' ? { id: 'k1' } : null),
  } as any;

  const mcpManager = {
    getEndpointByPath: (_p: string) => endpoint,
  } as any;

  const handler = async (headers: Record<string, string | undefined>, body: any) => {
    const endpointPath = typeof body?.params?.endpointPath === 'string' ? body.params.endpointPath : undefined;
    if (endpointPath) {
      const ep = mcpManager.getEndpointByPath(endpointPath);
      if (ep?.apiKeyId) {
        const apiKey = headers['X-API-Key'];
        if (!apiKey) return { status: 401 };
        const validated = fakeDb.validateApiKey(apiKey);
        if (!validated || validated.id !== ep.apiKeyId) return { status: 403 };
      }
    }
    return { status: 200 };
  };

  return { handler };
}

describe('hub endpoint api key auth', () => {
  test('requires key when endpoint has apiKeyId', async () => {
    const { handler } = makeServer();
    const res = await handler({}, { params: { endpointPath: '/api/mcp/coding' } });
    expect(res.status).toBe(401);
  });

  test('rejects invalid key', async () => {
    const { handler } = makeServer();
    const res = await handler({ 'X-API-Key': 'bad' }, { params: { endpointPath: '/api/mcp/coding' } });
    expect(res.status).toBe(403);
  });

  test('accepts valid key', async () => {
    const { handler } = makeServer();
    const res = await handler({ 'X-API-Key': 'good' }, { params: { endpointPath: '/api/mcp/coding' } });
    expect(res.status).toBe(200);
  });
});
