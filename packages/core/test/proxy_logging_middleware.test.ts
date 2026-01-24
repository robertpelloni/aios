import { describe, test, expect } from 'bun:test';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';
import { createLoggingMiddleware } from '../src/middleware/logging-middleware.js';

class MockMcpManager extends EventEmitter {
  getClient(_name: string) {
    return null;
  }
  getAllServers() {
    return [];
  }
}

class MockLogManager {
  entries: any[] = [];
  log(entry: any) {
    this.entries.push(entry);
  }
  calculateCost() {
    return 0;
  }
}

describe('proxy logging middleware', () => {
  test('logs include namespaceId and endpointPath', async () => {
    const logManager = new MockLogManager() as any;

    const proxy = new McpProxyManager(new MockMcpManager() as any, logManager, {
      policyService: { evaluate: () => ({ allowed: true }) } as any,
      savedScriptService: { getAllScripts: () => [] } as any,
    });

    proxy.useCallToolMiddleware(createLoggingMiddleware({ enabled: true, logManager }));

    await proxy.start();

    proxy.setNamespaceForSession('s', 'ns1');
    proxy.setEndpointForSession('s', '/api/mcp/coding');

    await proxy.callTool('namespace_get', {}, 's');

    const requestLog = (logManager.entries as any[]).find(e => e.type === 'request');
    expect(requestLog.args.namespaceId).toBe('ns1');
    expect(requestLog.args.endpointPath).toBe('/api/mcp/coding');
  });
});
