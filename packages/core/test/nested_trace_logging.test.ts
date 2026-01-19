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

describe('nested trace logging', () => {
  test('nested tool calls share traceId and increment depth', async () => {
    const logManager = new MockLogManager() as any;

    const proxy = new McpProxyManager(new MockMcpManager() as any, logManager, {
      policyService: { evaluate: () => ({ allowed: true }) } as any,
      savedScriptService: { getAllScripts: () => [] } as any,
    });

    proxy.useCallToolMiddleware(createLoggingMiddleware({ enabled: true, logManager }));

    proxy.registerInternalTool({
      name: 'inner',
      description: 'inner',
      inputSchema: { type: 'object' },
    }, async () => ({ content: [{ type: 'text', text: 'ok' }] }));

    proxy.registerInternalTool({
      name: 'outer',
      description: 'outer',
      inputSchema: { type: 'object' },
    }, async () => {
      await proxy.callTool('inner', {}, 's');
      return { content: [{ type: 'text', text: 'done' }] };
    });

    await proxy.start();

    await proxy.callTool('outer', {}, 's');

    const reqs = (logManager.entries as any[]).filter(e => e.type === 'request');
    const outer = reqs.find(e => e.tool === 'outer');
    const inner = reqs.find(e => e.tool === 'inner');

    expect(outer.args.traceId).toBeTruthy();
    expect(inner.args.traceId).toBe(outer.args.traceId);
    expect(inner.args.depth).toBeGreaterThan(outer.args.depth);
  });
});
