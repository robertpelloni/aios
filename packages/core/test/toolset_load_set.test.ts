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

describe('load_tool_set', () => {
  test('loads tool names from tool_ids', async () => {
    process.env.MCP_PROGRESSIVE_MODE = 'true';
    process.env.MCP_DISABLE_METAMCP = 'true';

    const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
      policyService: { evaluate: () => ({ allowed: true }) } as any,
      savedScriptService: { getAllScripts: () => [] } as any,
    });

    proxy.registerInternalTool({ name: 'a', inputSchema: { type: 'object' } } as any, async () => ({ content: [{ type: 'text', text: 'a' }] }));
    proxy.registerInternalTool({ name: 'b', inputSchema: { type: 'object' } } as any, async () => ({ content: [{ type: 'text', text: 'b' }] }));

    await proxy.start();

    const res = await proxy.callTool('load_tool_set', { toolSetId: 'missing' }, 's');
    expect(res.isError).toBeTruthy();
  });
});
