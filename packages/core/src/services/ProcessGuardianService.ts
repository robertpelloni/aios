import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';

export interface ManagedProcess {
  id: string;
  command: string;
  args: string[];
  options?: any;
  status: 'starting' | 'running' | 'crashed' | 'stopped';
  pid?: number;
  restarts: number;
  lastRestart?: number;
}

export class ProcessGuardianService extends EventEmitter {
  private static instance: ProcessGuardianService;
  private processes: Map<string, ManagedProcess> = new Map();
  private childProcesses: Map<string, ChildProcess> = new Map();
  private readonly MAX_RESTARTS = 5;
  private readonly RESTART_DELAY = 5000;

  private constructor() {
    super();
  }

  static getInstance(): ProcessGuardianService {
    if (!ProcessGuardianService.instance) {
      ProcessGuardianService.instance = new ProcessGuardianService();
    }
    return ProcessGuardianService.instance;
  }

  async startProcess(id: string, command: string, args: string[], options: any = {}): Promise<void> {
    if (this.processes.has(id) && this.processes.get(id)?.status === 'running') {
      return;
    }

    const processEntry: ManagedProcess = this.processes.get(id) || {
      id,
      command,
      args,
      options,
      status: 'starting',
      restarts: 0
    };

    this.processes.set(id, processEntry);
    this.spawn(id);
  }

  private spawn(id: string) {
    const entry = this.processes.get(id);
    if (!entry) return;

    console.log(`[Guardian] Spawning process: ${id} (${entry.command})`);
    
    const proc = spawn(entry.command, entry.args, {
      shell: process.platform === 'win32',
      ...entry.options
    });

    entry.pid = proc.pid;
    entry.status = 'running';
    this.childProcesses.set(id, proc);
    this.emit('updated', this.getProcessList());

    proc.on('exit', (code) => {
      console.warn(`[Guardian] Process ${id} exited with code ${code}`);
      entry.status = code === 0 ? 'stopped' : 'crashed';
      entry.pid = undefined;
      this.childProcesses.delete(id);

      if (entry.status === 'crashed' && entry.restarts < this.MAX_RESTARTS) {
        this.scheduleRestart(id);
      } else {
        this.emit('updated', this.getProcessList());
      }
    });

    proc.on('error', (err) => {
      console.error(`[Guardian] Process ${id} error:`, err);
      entry.status = 'crashed';
      this.emit('updated', this.getProcessList());
    });
  }

  private scheduleRestart(id: string) {
    const entry = this.processes.get(id);
    if (!entry) return;

    entry.restarts++;
    entry.lastRestart = Date.now();
    this.emit('updated', this.getProcessList());

    setTimeout(() => {
      if (entry.status === 'crashed') {
        this.spawn(id);
      }
    }, this.RESTART_DELAY);
  }

  async stopProcess(id: string) {
    const proc = this.childProcesses.get(id);
    const entry = this.processes.get(id);
    if (proc && entry) {
      entry.status = 'stopped';
      proc.kill();
      this.childProcesses.delete(id);
      this.emit('updated', this.getProcessList());
    }
  }

  getProcessList(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }
}
