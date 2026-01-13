import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { ArchitectMode, type ArchitectSession, type EditPlan } from '../../src/agents/ArchitectMode.ts';

describe('ArchitectMode', () => {
  let architect: ArchitectMode;
  let mockChatFn: any;

  beforeEach(() => {
    // Define mock inside beforeEach to reset it for every test
    mockChatFn = mock(async (model: string, messages: any[]) => {
      const allContent = messages.map(m => m.content).join(' ').toLowerCase();
      
      // JSON Planning response
      if (allContent.includes('json')) {
        return JSON.stringify({
          description: 'Implementation plan',
          estimatedComplexity: 'medium',
          files: [
            { path: 'src/file1.ts', action: 'modify', reasoning: 'Update logic' },
            { path: 'src/file2.ts', action: 'modify', reasoning: 'Update styles' }
          ],
          steps: ['Step 1', 'Step 2'],
          risks: ['Risk A']
        });
      }
      
      // Code Editing response
      if (allContent.includes('editor')) {
        return '// Edited code content';
      }
      
      return 'Architectural analysis and reasoning output.';
    });

    architect = new ArchitectMode({
      reasoningModel: 'o3-mini',
      editingModel: 'gpt-4o',
    });
    architect.setChatFunction(mockChatFn);
    // Silence error events
    architect.on('error', () => {});
  });

  describe('Session Management', () => {
    test('should start a new session', async () => {
      const session = await architect.startSession('Implement auth');
      
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.task).toBe('Implement auth');
      // Transition from reasoning to reviewing happens in background
      expect(['reasoning', 'reviewing']).toContain(session.status);
    });

    test('should get session by ID', async () => {
      const created = await architect.startSession('Test task');
      const retrieved = architect.getSession(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    test('should list all sessions', async () => {
      await architect.startSession('Task 1');
      await architect.startSession('Task 2');
      
      const sessions = architect.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Reasoning and Planning', () => {
    test('should invoke chat function for reasoning and planning', async () => {
      await architect.startSession('Complex feature');
      expect(mockChatFn).toHaveBeenCalled();
    });

    test('should emit lifecycle events', async () => {
      const events: string[] = [];
      architect.on('sessionStarted', () => events.push('started'));
      architect.on('planCreated', () => events.push('planned'));
      
      await architect.startSession('Test task');
      
      // Wait for background tasks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(events).toContain('started');
      expect(events).toContain('planned');
    });

    test('should handle reasoning errors', async () => {
      // Temporarily override for this specific test
      mockChatFn.mockImplementationOnce(async () => { throw new Error('Model timeout'); });
      
      const session = await architect.startSession('Will fail');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updated = architect.getSession(session.id);
      expect(updated?.status).toBe('error');
    });
  });

  describe('Plan Approval and Execution', () => {
    test('should transition to editing after approval', async () => {
      const session = await architect.startSession('Test task');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const approved = architect.approvePlan(session.id);
      expect(approved).toBe(true);
      expect(architect.getSession(session.id)?.status).toBe('editing');
    });

    test('should generate edits for planned files', async () => {
      const session = await architect.startSession('Multi-file task');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await architect.executeEdits(session.id);
      
      const updated = architect.getSession(session.id);
      expect(updated?.status).toBe('complete');
      expect(updated?.editOutput).toContain('src/file1.ts');
      expect(updated?.editOutput).toContain('src/file2.ts');
    });

    test('should reject plan', async () => {
      const session = await architect.startSession('Test task');
      const rejected = architect.rejectPlan(session.id, 'Too risky');
      
      expect(rejected).toBe(true);
      expect(architect.getSession(session.id)?.status).toBe('complete');
    });

    test('should revise plan with feedback', async () => {
      const session = await architect.startSession('Test task');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const revised = await architect.revisePlan(session.id, 'Use different pattern');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updated = architect.getSession(session.id);
      expect(revised).toBeDefined();
      expect(updated?.status).toBe('reviewing');
    });
  });
});
