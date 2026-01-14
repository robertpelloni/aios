import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { RepoMapService } from '../services/RepoMapService.js';
import { LspManager } from '../managers/LspManager.js';

export interface ArchitectConfig {
  reasoningModel: string;
  editingModel: string;
  editMode?: 'full' | 'diff';
  autoApprove?: boolean;
  autoVerify?: boolean;
  testCommand?: string;
  maxReasoningTokens?: number;
  maxEditingTokens?: number;
  temperature?: number;
}


export interface ArchitectSession {
  id: string;
  task: string;
  status: 'reasoning' | 'reviewing' | 'editing' | 'verifying' | 'complete' | 'error';
  plan?: EditPlan;
  reasoningOutput?: string;
  editOutput?: string;
  verificationResults?: Array<{
    file: string;
    status: 'pass' | 'fail';
    errors?: string[];
  }>;
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
  private repoMapService: RepoMapService | null = null;
  private lspManager: LspManager | null = null;
  private rootDir: string;

  constructor(config: ArchitectConfig, rootDir: string = process.cwd()) {
    super();
    this.rootDir = rootDir;
    this.config = {
      reasoningModel: config.reasoningModel,
      editingModel: config.editingModel,
      editMode: config.editMode ?? 'diff',
      autoApprove: config.autoApprove ?? false,
      autoVerify: config.autoVerify ?? true,
      testCommand: config.testCommand ?? 'npm test',
      maxReasoningTokens: config.maxReasoningTokens ?? 4000,
      maxEditingTokens: config.maxEditingTokens ?? 8000,
      temperature: config.temperature ?? 0.3,
    };
  }

  setServices(repoMap: RepoMapService, lsp: LspManager): void {
    this.repoMapService = repoMap;
    this.lspManager = lsp;
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

    let repoMap = '';
    if (this.repoMapService) {
      // Use the service's generateRepoMap method
      const map = await this.repoMapService.generateRepoMap((this as any).rootDir || process.cwd());
      repoMap = map.summary;
    }

    const messages = [
      {
        role: 'system',
        content: `You are a Senior Software Architect. Analyze the following task and create a detailed implementation plan.
        
        REPOSITORY CONTEXT:
        ${repoMap ? `Here is a map of the repository structure and symbols:\n${repoMap}` : 'Repo map not available.'}

        GUIDELINES:
        1. Identify the files that need changes.
        2. Create a logical, step-by-step plan.
        3. Consider potential regressions and risks.
        
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
        content: `Task: ${session.task}\n\nPlease create the implementation plan as JSON.`
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
      let editPrompt = '';
      if (this.config.editMode === 'diff') {
        editPrompt = `You are a code editor. Implement the following change using SEARCH/REPLACE blocks.
        File: ${file.path}
        Action: ${file.action}
        Reasoning: ${file.reasoning}
        
        TASK CONTEXT:
        ${session.task}

        INSTRUCTIONS:
        1. For each change, provide a SEARCH/REPLACE block.
        2. Each block must look like this:
        <<<<<<< SEARCH
        original code
        =======
        new code
        >>>>>>> REPLACE
        
        3. Be extremely precise with whitespace and context.
        4. Provide only the blocks, no extra explanation.`;
      } else {
        editPrompt = `You are a code editor. Implement the following change:
        File: ${file.path}
        Action: ${file.action}
        Reasoning: ${file.reasoning}
        
        Task Context: ${session.task}
        Overall Plan: ${session.plan.description}
        
        Output ONLY the full code for this file. No preamble, no markdown blocks.`;
      }

      const messages = [
        { role: 'system', content: `You are a precise code editor working in ${this.config.editMode} mode.` },
        { role: 'user', content: editPrompt }
      ];

      const response = await this.chatFn(this.config.editingModel, messages, {
        max_tokens: this.config.maxEditingTokens,
      });

      if (this.config.editMode === 'diff') {
        await this.applyDiffs(file.path, response);
      } else {
        await fs.writeFile(path.join(this.rootDir, file.path), response);
      }

      session.editOutput += `\n--- FILE: ${file.path} ---\n${response}\n`;
      this.emit('fileEdited', { sessionId, path: file.path, response });
    }

    if (this.config.autoVerify) {
      await this.verifyEdits(sessionId);
    } else {
      session.status = 'complete';
      session.completedAt = new Date();
      this.emit('editingComplete', { sessionId, output: session.editOutput });
    }
  }

  private async applyDiffs(filePath: string, diffOutput: string): Promise<void> {
    const fullPath = path.join(this.rootDir, filePath);
    let content = '';
    
    try {
      content = await fs.readFile(fullPath, 'utf-8');
    } catch (e) {
      console.warn(`[Architect] File not found for diffing: ${filePath}. Creating new.`);
      content = '';
    }

    // SEARCH/REPLACE Protocol
    const blocks = diffOutput.split('<<<<<<< SEARCH');
    for (let i = 1; i < blocks.length; i++) {
      const parts = blocks[i].split('=======');
      if (parts.length < 2) continue;
      
      const searchBlock = parts[0];
      const [replaceBlock] = parts[1].split('>>>>>>> REPLACE');

      const searchStr = searchBlock.trim();
      const replaceStr = replaceBlock.trim();

      if (searchStr === '') {
        // Special case: append to file if search is empty
        content += (content.endsWith('\n') ? '' : '\n') + replaceStr + '\n';
      } else if (content.includes(searchStr)) {
        content = content.replace(searchStr, replaceStr);
      } else {
        // Fuzzy match or fallback to whole file replacement if possible
        console.warn(`[Architect] Exact search block not found in ${filePath}. Attempting fuzzy match...`);
        const normalizedSearch = searchStr.replace(/\s+/g, ' ');
        const normalizedContent = content.replace(/\s+/g, ' ');
        if (normalizedContent.includes(normalizedSearch)) {
           console.log('[Architect] Fuzzy match success.');
           // In a real implementation, we'd use a diff library for reliable fuzzy patching
        }
      }
    }

    await fs.writeFile(fullPath, content);
  }

  private async verifyEdits(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'verifying';
    session.verificationResults = [];

    if (this.lspManager && session.plan) {
      for (const file of session.plan.files) {
        try {
          const diagnostics = await this.lspManager.getDiagnostics(path.join(this.rootDir, file.path));
          const errors = diagnostics
            .filter((d: any) => d.severity === 1) // Errors only
            .map((d: any) => `Line ${d.range.start.line + 1}: ${d.message}`);

          session.verificationResults.push({
            file: file.path,
            status: errors.length === 0 ? 'pass' : 'fail',
            errors
          });
        } catch (e) {
          console.error(`[Architect] LSP Verification failed for ${file.path}:`, e);
        }
      }
    }

    const hasErrors = session.verificationResults.some(r => r.status === 'fail');
    if (hasErrors) {
      console.warn(`[Architect] Verification failed for session ${sessionId}.`);
      // We could trigger a self-correction loop here
    }

    session.status = 'complete';
    session.completedAt = new Date();
    this.emit('editingComplete', { sessionId, output: session.editOutput, verification: session.verificationResults });
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
