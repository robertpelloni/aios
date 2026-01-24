import { describe, test, expect } from 'bun:test';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

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

describe('namespace override annotations', () => {
  test('merges overrideAnnotations into tools/list entries', async () => {
    process.env.MCP_DISABLE_METAMCP = 'true';
    process.env.MCP_PROGRESSIVE_MODE = 'false';

    const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
      policyService: { evaluate: () => ({ allowed: true }) } as any,
      savedScriptService: { getAllScripts: () => [] } as any,
    });

    (proxy as any).toolRegistry.set('x', 'internal');
    (proxy as any).toolDefinitions.set('x', { name: 'x', description: 'desc', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } });

    await proxy.callTool('namespace_set', { namespaceId: 'ns1' }, 'sess');
    await proxy.callTool(
      'namespace_tool_override_set',
      {
        namespaceId: 'ns1',
        toolName: 'x',
        status: 'active',
        overrideAnnotations: { readOnlyHint: false, custom: 'y' },
      },
      'sess'
    );

    const tools = await proxy.getAllTools('sess');
    const tool = (tools as any[]).find((t) => t.name === 'x');
    expect(Boolean(tool)).toBe(true);
    expect(tool.annotations?.readOnlyHint).toBe(false);
    expect(tool.annotations?.custom).toBe('y');
  });
});
