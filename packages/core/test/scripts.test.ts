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

describe('saved scripts tools', () => {
    test('policy can deny script_create', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
            policyService: {
                evaluate: (ctx: any) => ({ allowed: ctx.toolName !== 'script_create', reason: 'denied' })
            } as any
        });

        await proxy.start();

        const res = await proxy.callTool('script_create', { name: 'x', code: 'return 1;' });
        expect(res.isError).toBeTruthy();
        expect(res.content[0].text).toContain('Policy Blocked');
    });

    test('scripts_list returns json array (even without DB)', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
            policyService: { evaluate: () => ({ allowed: true }) } as any
        });

        await proxy.start();

        const res = await proxy.callTool('scripts_list', {});
        expect(res.isError).toBeFalsy();
        const arr = JSON.parse(res.content[0].text);
        expect(Array.isArray(arr)).toBeTrue();
    });
});
