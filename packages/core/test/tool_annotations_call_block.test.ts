import { describe, test, expect } from 'bun:test';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';
import { ToolAnnotationManager } from '../src/managers/ToolAnnotationManager.js';

class MockMcpManager extends EventEmitter {
  getClient(_name: string) {
    return null;
  }
  getAllServers() {
    return [];
  }
}

class MockLogManager {
  log(_entry: any) {}
  calculateCost() {
    return 0;
  }
}

describe('tool annotation call blocking', () => {
  test('blocks tool call when annotation uiHints.hidden is true', async () => {
    process.env.MCP_DISABLE_METAMCP = 'true';

    const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any);

    (proxy as any).toolRegistry.set('b', 'internal');
    (proxy as any).toolDefinitions.set('b', { name: 'b', description: 'b', inputSchema: { type: 'object' } });
    (proxy as any).namespaceOverrides.setOverride('ns', 'b', 'active');

    const anns = new ToolAnnotationManager();
    anns.setAnnotation('internal', 'b', { uiHints: { hidden: true } });
    proxy.setToolAnnotationManager(anns as any);

    proxy.useCallToolMiddleware((next: any) => async (req: any, ctx: any) => {
      if (req.params.name === 'b') {
        return { content: [{ type: 'text', text: 'ok' }] };
      }
      return next(req, ctx);
    });

    const res = await proxy.callToolRpc({ method: 'tools/call', params: { name: 'b', arguments: {} } } as any, {
      sessionId: 's',
      namespaceId: 'ns',
    });

    expect(res.isError).toBeTruthy();
  });
});
