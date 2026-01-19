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

describe('run_task', () => {
    test('runs tool then agent step sequence', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
            policyService: { evaluate: () => ({ allowed: true }) } as any
        });

        proxy.registerInternalTool({
            name: 'mock_echo',
            description: 'Echo',
            inputSchema: { type: 'object', properties: { message: { type: 'string' } } }
        }, async (args: any) => ({ content: [{ type: 'text', text: String(args.message) }] }));

        const agentManager = {
            getAgents: () => [{ name: 'coder', model: 'gpt-4o', description: '', instructions: '' }]
        } as any;

        const agentExecutor = {
            run: async (_agent: any, task: string) => `agent:${task}`
        } as any;

        proxy.setAgentDependencies(agentExecutor, agentManager);

        await proxy.start();

        const res = await proxy.callTool('run_task', {
            steps: [
                { type: 'tool', name: 'mock_echo', args: { message: 'hi' } },
                { type: 'agent', name: 'coder', task: 'do thing', args: { foo: 'bar' } }
            ]
        });

        expect(res.isError).toBeFalsy();
        const payload = JSON.parse(res.content[0].text);
        expect(payload.results.length).toBe(2);
    });

    test('stops on error by default', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
            policyService: { evaluate: () => ({ allowed: true }) } as any
        });

        await proxy.start();

        const res = await proxy.callTool('run_task', {
            steps: [
                { type: 'tool', name: 'run_code', args: { code: 'return 1;' } },
                { type: 'tool', name: 'mock_echo', args: { message: 'later' } }
            ]
        });

        expect(res.isError).toBeTruthy();
    });

    test('continues on error when stopOnError=false', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const proxy = new McpProxyManager(new MockMcpManager() as any, new MockLogManager() as any, {
            policyService: { evaluate: () => ({ allowed: true }) } as any
        });

        proxy.registerInternalTool({
            name: 'mock_echo',
            description: 'Echo',
            inputSchema: { type: 'object', properties: { message: { type: 'string' } } }
        }, async (args: any) => ({ content: [{ type: 'text', text: String(args.message) }] }));

        await proxy.start();

        const res = await proxy.callTool('run_task', {
            stopOnError: false,
            steps: [
                { type: 'tool', name: 'run_code', args: { code: 'return 1;' } },
                { type: 'tool', name: 'mock_echo', args: { message: 'ok' } }
            ]
        });

        expect(res.isError).toBeFalsy();
        const payload = JSON.parse(res.content[0].text);
        expect(payload.results.length).toBe(2);
    });
});
