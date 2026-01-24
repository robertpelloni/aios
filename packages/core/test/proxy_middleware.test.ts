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

describe('McpProxyManager middleware', () => {
    test('list middleware can filter tools', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
            policyService: { evaluate: () => ({ allowed: true }) } as any,
            savedScriptService: { getAllScripts: () => [] } as any
        });

        proxy.useListToolsMiddleware((next: any) => async (req: any, ctx: any) => {
            const res = await next(req, ctx);
            return { tools: res.tools.filter((t: any) => t.name !== 'search_tools') };
        });

        const tools = await proxy.getAllTools('s');
        expect(tools.find((t: any) => t.name === 'search_tools')).toBeUndefined();
    });

    test('call middleware can block tool calls', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
            policyService: { evaluate: () => ({ allowed: true }) } as any,
            savedScriptService: { getAllScripts: () => [] } as any
        });

        proxy.useCallToolMiddleware((_next: any) => async (req: any, _ctx: any) => {
            if (req.params.name === 'run_code') {
                return { isError: true, content: [{ type: 'text', text: 'blocked by mw' }] };
            }
            return { content: [{ type: 'text', text: 'ok' }] };
        });

        const res = await proxy.callTool('run_code', { code: 'return 1;' }, 's');
        expect(res.isError).toBeTruthy();
    });
});
