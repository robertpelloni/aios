import { describe, test, expect } from 'bun:test';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

class MockMcpManager extends EventEmitter {
    getClient(name: string) {
        return null;
    }
    getAllServers() {
        return [];
    }
}

class MockLogManager {
    log(entry: any) {}
    calculateCost() {
        return 0;
    }
}

describe('script__ dynamic tools', () => {
    test('getAllTools includes script__ tools from saved scripts', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
            policyService: { evaluate: () => ({ allowed: true }) } as any
        });

        const list = await proxy.getAllTools('sess');
        expect(Array.isArray(list)).toBeTrue();
    });

    test('script__ tool routes to executeScriptByName when DB available', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const savedScriptService = {
            getAllScripts: () => [{ id: '1', name: 'hello', code: 'return 1;', language: 'javascript', isFavorite: false, runCount: 0, createdAt: 0, updatedAt: 0 }],
            executeScriptByName: async () => ({ success: true, result: 123, logs: [], durationMs: 1, script: { id: '1', name: 'hello', code: 'return 1;', language: 'javascript', isFavorite: false, runCount: 0, createdAt: 0, updatedAt: 0 } })
        } as any;

        const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
            policyService: { evaluate: () => ({ allowed: true }) } as any,
            savedScriptService
        } as any);

        await proxy.start();

        const res = await proxy.callTool('script__hello', { foo: 'bar' }, 'sess');
        expect(res.isError).toBeFalsy();
        const payload = JSON.parse(res.content[0].text);
        expect(payload.result).toBe(123);
    });
});
