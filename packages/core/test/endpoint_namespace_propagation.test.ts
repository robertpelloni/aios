import { describe, test, expect } from 'bun:test';
import { EventEmitter } from 'events';
import { HubServer } from '../src/hub/HubServer.js';

class DummyRouter {
    private ns = new Map<string, string>();

    setNamespaceForSession(sessionId: string, namespaceId: string) {
        this.ns.set(sessionId, namespaceId);
    }

    async getAllTools(sessionId: string) {
        const current = this.ns.get(sessionId);
        return [{ name: current ? `ns:${current}` : 'ns:null' }];
    }

    async callTool() {
        return { content: [{ type: 'text', text: 'ok' }] };
    }
}

describe('endpoint namespace propagation', () => {
    test('tools/list sets session namespace from endpointPath', async () => {
        const router = new DummyRouter() as any;
        const hub = new HubServer(router, {} as any, undefined, undefined, undefined, (path: string) => {
            if (path === '/api/mcp/coding') return 'ns-coding';
            return undefined;
        });

        const res = await hub.handleMessage('s1', {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: { endpointPath: '/api/mcp/coding' }
        });

        expect(res.result.tools[0].name).toBe('ns:ns-coding');
    });
});
