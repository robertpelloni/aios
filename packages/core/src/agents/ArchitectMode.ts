import { EventEmitter } from 'events';

export interface ArchitectConfig {
  reasoningModel: string;
  editingModel: string;
  autoApprove?: boolean;
  maxReasoningTokens?: number;
  maxEditingTokens?: number;
  temperature?: number;
}

export interface ArchitectSession {
  id: string;
  task: string;
  status: 'reasoning' | 'reviewing' | 'editing' | 'complete' | 'error';
  plan?: EditPlan;
  reasoningOutput?: string;
  editOutput?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface EditPlan {
  description: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  files: Array<{
    path: string;
    action: 'create' | 'modify' | 'delete';
    reasoning: string;
  }>;
  steps: string[];
  risks?: string[];
}

export type ModelChatFn = (model: string, messages: any[], options?: any) => Promise<string>;

export class ArchitectMode extends EventEmitter {
  private config: Required<ArchitectConfig>;
  private sessions: Map<string, ArchitectSession> = new Map();
  private chatFn: ModelChatFn | null = null;

  constructor(config: ArchitectConfig) {
    super();
    this.config = {
      reasoningModel: config.reasoningModel,
      editingModel: config.editingModel,
      autoApprove: config.autoApprove ?? false,
      maxReasoningTokens: config.maxReasoningTokens ?? 4000,
      maxEditingTokens: config.maxEditingTokens ?? 8000,
      temperature: config.temperature ?? 0.3,
    };
  }

  setChatFunction(fn: ModelChatFn): void {
    this.chatFn = fn;
  }

  async startSession(task: string): Promise<ArchitectSession> {
    if (!this.chatFn) {
      throw new Error('Chat function not set. Call setChatFunction first.');
    }

    const sessionId = `arch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const session: ArchitectSession = {
      id: sessionId,
      task,
      status: 'reasoning',
      startedAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.emit('sessionStarted', { sessionId, task });

    // Run reasoning in background
    this.reason(sessionId).catch(error => {
      session.status = 'error';
      session.error = error.message;
      this.emit('error', { sessionId, error: error.message });
    });

    return session;
  }

  private async reason(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !this.chatFn) return;

    const messages = [
      {
        role: 'system',
        content: `You are a Senior Software Architect. Analyze the following task and create a detailed implementation plan.
        Output your analysis first, followed by a JSON object with this structure:
        {
          "description": "Short summary",
          "estimatedComplexity": "low" | "medium" | "high",
          "files": [{"path": "string", "action": "create"|"modify"|"delete", "reasoning": "string"}],
          "steps": ["string"],
          "risks": ["string"]
        }
        Ensure the JSON is at the very end of your response.`
      },
      {
        role: 'user',
        content: `Task: ${session.task}\n\nPlease create the edit plan as JSON.`
      }
    ];

    const output = await this.chatFn(this.config.reasoningModel, messages, {
      max_tokens: this.config.maxReasoningTokens,
      temperature: this.config.temperature,
    });

    session.reasoningOutput = output;
    this.emit('reasoningComplete', { sessionId, output });

    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        session.plan = JSON.parse(jsonMatch[0]);
        session.status = 'reviewing';
        this.emit('planCreated', { sessionId, plan: session.plan });

        if (this.config.autoApprove) {
          this.approvePlan(sessionId);
        }
      } else {
        throw new Error('Failed to parse edit plan from model output.');
      }
    } catch (e) {
      session.status = 'error';
      session.error = (e as Error).message;
      this.emit('error', { sessionId, error: session.error });
    }
  }

  approvePlan(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'reviewing') return false;

    session.status = 'editing';
    this.emit('planApproved', { sessionId });
    
    this.executeEdits(sessionId).catch(error => {
      session.status = 'error';
      session.error = error.message;
      this.emit('error', { sessionId, error: error.message });
    });

    return true;
  }

  async executeEdits(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.plan || !this.chatFn) return;

    this.emit('editingStarted', { sessionId });
    session.editOutput = '';

    for (const file of session.plan.files) {
      const editPrompt = `You are a code editor. Implement the following change:
      File: ${file.path}
      Action: ${file.action}
      Reasoning: ${file.reasoning}
      
      Task Context: ${session.task}
      Overall Plan: ${session.plan.description}
      
      Output ONLY the full code for this file. No preamble, no markdown blocks.`;

      const messages = [
        { role: 'system', content: 'You are a precise code editor. Output ONLY code.' },
        { role: 'user', content: editPrompt }
      ];

      const code = await this.chatFn(this.config.editingModel, messages, {
        max_tokens: this.config.maxEditingTokens,
      });

      session.editOutput += `\n--- FILE: ${file.path} ---\n${code}\n`;
      this.emit('fileEdited', { sessionId, path: file.path, code });
    }

    session.status = 'complete';
    session.completedAt = new Date();
    this.emit('editingComplete', { sessionId, output: session.editOutput });
  }

  rejectPlan(sessionId: string, feedback?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'complete';
    session.completedAt = new Date();
    this.emit('planRejected', { sessionId, feedback });
    return true;
  }

  async revisePlan(sessionId: string, feedback: string): Promise<EditPlan | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.status = 'reasoning';
    session.task += `\n\nRevision feedback: ${feedback}`;
    this.emit('planRevised', { sessionId, feedback });
    
    await this.reason(sessionId);
    return session.plan || null;
  }

  getSession(id: string): ArchitectSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): ArchitectSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessions(): ArchitectSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status !== 'complete' && s.status !== 'error');
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  getConfig(): Required<ArchitectConfig> {
    return this.config;
  }

  exportSession(id: string): string | null {
    const session = this.sessions.get(id);
    return session ? JSON.stringify(session) : null;
  }

  importSession(data: string): ArchitectSession {
    const session: ArchitectSession = JSON.parse(data);
    session.startedAt = new Date(session.startedAt);
    if (session.completedAt) session.completedAt = new Date(session.completedAt);
    this.sessions.set(session.id, session);
    return session;
  }
}
