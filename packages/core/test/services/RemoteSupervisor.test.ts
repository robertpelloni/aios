import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { RemoteSupervisor } from '../../src/supervisors/RemoteSupervisor.ts';

describe('RemoteSupervisor', () => {
  let supervisor: RemoteSupervisor;

  beforeEach(() => {
    supervisor = new RemoteSupervisor({
      name: 'Remote-1',
      provider: 'remote',
      remoteUrl: 'http://localhost:3001',
      remoteSupervisorName: 'Local-Expert',
    });
  });

  test('should have correct configuration', () => {
    expect(supervisor.name).toBe('Remote-1');
  });

  test('should attempt to chat via fetch', async () => {
    // Mock global fetch
    const originalFetch = global.fetch;
    global.fetch = mock(async () => ({
      ok: true,
      json: async () => ({ response: 'Remote assessment' }),
    })) as any;

    try {
      const response = await supervisor.chat([{ role: 'user', content: 'test' }]);
      expect(response).toBe('Remote assessment');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
