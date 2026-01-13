import { spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface WorktreeConfig {
  baseDir: string;
  maxWorktrees?: number;
  cleanupOnExit?: boolean;
  defaultBranch?: string;
}

export interface Worktree {
  id: string;
  path: string;
  branch: string;
  agentId: string | null;
  createdAt: Date;
  status: 'available' | 'in_use' | 'merging' | 'error';
  lastActivity?: Date;
}

export interface MergeResult {
  success: boolean;
  mergedCommits: number;
  conflicts: string[];
}

export class GitWorktreeManager extends EventEmitter {
  private config: Required<WorktreeConfig>;
  private worktrees: Map<string, Worktree> = new Map();
  private worktreeDir: string;

  constructor(config: WorktreeConfig) {
    super();
    this.config = {
      baseDir: config.baseDir,
      maxWorktrees: config.maxWorktrees ?? 5,
      cleanupOnExit: config.cleanupOnExit ?? true,
      defaultBranch: config.defaultBranch ?? 'main',
    };
    this.worktreeDir = path.join(this.config.baseDir, '.aios-worktrees');
    
    if (!fs.existsSync(this.worktreeDir)) {
      fs.mkdirSync(this.worktreeDir, { recursive: true });
    }

    if (this.config.cleanupOnExit) {
      process.on('exit', () => this.cleanupAll());
    }
  }

  async createWorktree(agentId?: string): Promise<Worktree> {
    if (this.worktrees.size >= this.config.maxWorktrees) {
      const available = Array.from(this.worktrees.values()).find(w => w.status === 'available');
      if (available) {
        return this.assignWorktree(available.id, agentId);
      }
      throw new Error(`Maximum worktrees reached`);
    }

    const id = `wt-${crypto.randomBytes(4).toString('hex')}`;
    const branch = `agent/${id}`;
    const worktreePath = path.join(this.worktreeDir, id);

    try {
      execSync(`git branch ${branch} ${this.config.defaultBranch}`, { cwd: this.config.baseDir, stdio: 'pipe' });
      execSync(`git worktree add "${worktreePath}" ${branch}`, { cwd: this.config.baseDir, stdio: 'pipe' });

      const worktree: Worktree = {
        id,
        path: worktreePath,
        branch,
        agentId: agentId ?? null,
        createdAt: new Date(),
        status: agentId ? 'in_use' : 'available',
        lastActivity: new Date(),
      };

      this.worktrees.set(id, worktree);
      return worktree;
    } catch (error) {
      throw error;
    }
  }

  assignWorktree(worktreeId: string, agentId?: string): Worktree {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) throw new Error(`Worktree not found`);
    
    worktree.agentId = agentId ?? null;
    worktree.status = 'in_use';
    worktree.lastActivity = new Date();
    return worktree;
  }

  releaseWorktree(worktreeId: string): void {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) return;
    worktree.agentId = null;
    worktree.status = 'available';
  }

  async syncWithMain(worktreeId: string): Promise<{ success: boolean; conflicts: string[] }> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) throw new Error(`Worktree not found`);

    try {
      execSync(`git fetch origin ${this.config.defaultBranch}`, { cwd: worktree.path, stdio: 'pipe' });
      execSync(`git merge origin/${this.config.defaultBranch} --no-edit`, { cwd: worktree.path, stdio: 'pipe' });
      return { success: true, conflicts: [] };
    } catch (error) {
      return { success: false, conflicts: ['Merge conflict or fetch failed'] };
    }
  }

  async mergeToMain(worktreeId: string, message?: string): Promise<MergeResult> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) throw new Error(`Worktree not found`);

    try {
      execSync(`git add -A`, { cwd: worktree.path, stdio: 'pipe' });
      execSync(`git commit -m "${message || 'Merge agent worktree'}"`, { cwd: worktree.path, stdio: 'pipe' });
      
      execSync(`git checkout ${this.config.defaultBranch}`, { cwd: this.config.baseDir, stdio: 'pipe' });
      execSync(`git merge ${worktree.branch} --no-edit`, { cwd: this.config.baseDir, stdio: 'pipe' });

      return { success: true, mergedCommits: 1, conflicts: [] };
    } catch (error) {
      return { success: false, mergedCommits: 0, conflicts: ['Merge failed'] };
    }
  }

  async removeWorktree(worktreeId: string): Promise<void> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) return;

    try {
      execSync(`git worktree remove "${worktree.path}" --force`, { cwd: this.config.baseDir, stdio: 'pipe' });
      execSync(`git branch -D ${worktree.branch}`, { cwd: this.config.baseDir, stdio: 'pipe' });
      this.worktrees.delete(worktreeId);
    } catch (error) {
      if (fs.existsSync(worktree.path)) {
        fs.rmSync(worktree.path, { recursive: true, force: true });
      }
      this.worktrees.delete(worktreeId);
    }
  }

  getWorktree(id: string): Worktree | undefined {
    return this.worktrees.get(id);
  }

  listWorktrees(): Worktree[] {
    return Array.from(this.worktrees.values());
  }

  cleanupAll(): void {
    for (const id of this.worktrees.keys()) {
      this.removeWorktree(id).catch(() => {});
    }
  }
}
