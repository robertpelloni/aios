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

describe('session tool filtering', () => {
  test('tools/list filtered to loaded tools in progressive mode', async () => {
    process.env.MCP_PROGRESSIVE_MODE = 'true';
    process.env.MCP_DISABLE_METAMCP = 'true';

    const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
      policyService: { evaluate: () => ({ allowed: true }) } as any,
      savedScriptService: { getAllScripts: () => [] } as any,
    });

    proxy.registerInternalTool({
      name: 'a',
      description: 'a',
      inputSchema: { type: 'object' },
    }, async () => ({ content: [{ type: 'text', text: 'a' }] }));

    proxy.registerInternalTool({
      name: 'b',
      description: 'b',
      inputSchema: { type: 'object' },
    }, async () => ({ content: [{ type: 'text', text: 'b' }] }));

    await proxy.start();

    await proxy.callTool('load_tool', { name: 'a' }, 's');

    const tools = await proxy.getAllTools('s');
    expect(tools.find((t: any) => t.name === 'a')).toBeTruthy();
    expect(tools.find((t: any) => t.name === 'b')).toBeUndefined();
  });
});
