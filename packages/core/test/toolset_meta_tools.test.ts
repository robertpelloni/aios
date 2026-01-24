import { describe, test, expect } from 'bun:test';
import { EventEmitter } from 'events';
import { rmSync, mkdtempSync } from 'fs';
import path from 'path';
import os from 'os';
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

describe('toolset meta tools', () => {
  test('save_tool_set and toolset_list', async () => {
    process.env.MCP_PROGRESSIVE_MODE = 'true';
    process.env.MCP_DISABLE_METAMCP = 'true';

    const dir = mkdtempSync(path.join(os.tmpdir(), 'aios-toolset-test-'));
    process.env.AIOS_DATA_DIR = dir;

    const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
      policyService: { evaluate: () => ({ allowed: true }) } as any,
      savedScriptService: { getAllScripts: () => [] } as any,
    });

    await proxy.start();

    await proxy.callTool('load_tool', { name: 'a' }, 's');

    const saved = await proxy.callTool('save_tool_set', { name: 'My Set' }, 's');
    expect(saved.isError).toBeTruthy();

    const listed = await proxy.callTool('toolset_list', {}, 's');
    expect(listed.isError).toBeTruthy();

    rmSync(dir, { recursive: true, force: true });
  });
});
