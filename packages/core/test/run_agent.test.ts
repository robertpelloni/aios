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

describe('run_agent', () => {
    test('runs agent via injected dependencies', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const mcpManager = new MockMcpManager() as any;
        const logManager = new MockLogManager() as any;

        const proxy = new McpProxyManager(mcpManager, logManager, {
            policyService: { evaluate: () => ({ allowed: true }) } as any
        });

        const agentManager = {
            getAgents: () => [{ name: 'coder', model: 'gpt-4o', description: '', instructions: '' }]
        } as any;

        const agentExecutor = {
            run: async (_agent: any, task: string) => `ok:${task}`
        } as any;

        proxy.setAgentDependencies(agentExecutor, agentManager);

        await proxy.start();

        const res = await proxy.callTool('run_agent', { agentName: 'coder', task: 'hello' });
        expect(res.isError).toBeFalsy();
        expect(res.content[0].text).toBe('ok:hello');
    });

    test('blocks run_agent when policy denies', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const mcpManager = new MockMcpManager() as any;
        const logManager = new MockLogManager() as any;

        const proxy = new McpProxyManager(mcpManager, logManager, {
            policyService: { evaluate: () => ({ allowed: false, reason: 'nope' }) } as any
        });

        await proxy.start();

        const res = await proxy.callTool('run_agent', { agentName: 'coder', task: 'hello' });
        expect(res.isError).toBeTruthy();
        expect(res.content[0].text).toContain('Policy Blocked');
    });
});
