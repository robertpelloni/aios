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

describe('tool annotation listTools middleware', () => {
  test('hides tools with uiHints.hidden and applies displayName', async () => {
    process.env.MCP_DISABLE_METAMCP = 'true';
    process.env.MCP_PROGRESSIVE_MODE = 'false';

    const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any);

    (proxy as any).toolRegistry.set('a', 'internal');
    (proxy as any).toolDefinitions.set('a', { name: 'a', description: 'a', inputSchema: { type: 'object' } });
    (proxy as any).toolRegistry.set('b', 'internal');
    (proxy as any).toolDefinitions.set('b', { name: 'b', description: 'b', inputSchema: { type: 'object' } });

    (proxy as any).namespaceOverrides.setOverride('default', 'a', 'active');
    (proxy as any).namespaceOverrides.setOverride('default', 'b', 'active');

    const anns = new ToolAnnotationManager();
    anns.setAnnotation('internal', 'a', { uiHints: { hidden: true } });
    anns.setAnnotation('internal', 'b', { displayName: 'B', uiHints: {} });
    proxy.setToolAnnotationManager(anns as any);

    const tools = await proxy.listTools({ method: 'tools/list', params: {} } as any, { sessionId: 's', namespaceId: 'default' });
    const byName = new Map((tools.tools as any[]).map((t) => [t.name, t]));
    const b = byName.get('b');
    expect(Boolean(b)).toBe(true);
    expect(b.annotations?.displayName).toBe('B');

    expect(byName.has('a')).toBe(false);
  });
});
