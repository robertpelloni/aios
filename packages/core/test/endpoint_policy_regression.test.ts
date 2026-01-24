import { describe, test, expect } from 'bun:test';
import { EventEmitter } from 'events';
import { HubServer } from '../src/hub/HubServer.js';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

class MockMcpManager extends EventEmitter {
  getClient(_name: string) {
    return null;
  }
  getAllServers() {
    return [];
  }
  getEndpointByPath(path: string) {
    if (path === '/api/mcp/coding') return { namespaceId: 'ns-coding' };
    return null;
  }
}

class MockLogManager {
  log(_entry: any) {}
  calculateCost() {
    return 0;
  }
}

describe('endpointPath propagation (meta tools)', () => {
  test('endpointPath is provided for run_agent policy evaluation', async () => {
    const mcpManager = new MockMcpManager() as any;
    const logManager = new MockLogManager() as any;

    const seen: string[] = [];
    const policyService = {
      evaluate: (ctx: any) => {
        if (ctx.toolName === 'run_agent') {
          seen.push(String(ctx.endpointPath));
        }
        return { allowed: true };
      },
    } as any;

    const proxy = new McpProxyManager(mcpManager, logManager, {
      policyService,
      savedScriptService: { getAllScripts: () => [] } as any,
    });

    proxy.setAgentDependencies({ run: async () => 'ok' } as any, { getAgents: () => [{ name: 'coder' }] } as any);

    await proxy.start();

    const hub = new HubServer(
      proxy as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      (endpointPath: string) => mcpManager.getEndpointByPath(endpointPath)?.namespaceId,
    );

    await hub.handleMessage('s1', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'run_agent', arguments: { agentName: 'coder', task: 't' }, endpointPath: '/api/mcp/coding' },
    });

    expect(seen[0]).toBe('/api/mcp/coding');
  });
});
