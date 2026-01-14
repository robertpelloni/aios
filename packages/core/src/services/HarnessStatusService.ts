import { EventEmitter } from 'events';

export interface HarnessStatus {
  activeSessionId?: string;
  currentModel?: string;
  totalCostUsd: number;
  totalTokens: number;
  sessionDuration: number;
  gitBranch?: string;
  cwd: string;
}

export class HarnessStatusService extends EventEmitter {
  private static instance: HarnessStatusService;
  private status: HarnessStatus = {
    totalCostUsd: 0,
    totalTokens: 0,
    sessionDuration: 0,
    cwd: process.cwd()
  };
  private startTime: number = Date.now();

  private constructor() {
    super();
    this.startTracking();
  }

  static getInstance(): HarnessStatusService {
    if (!HarnessStatusService.instance) {
      HarnessStatusService.instance = new HarnessStatusService();
    }
    return HarnessStatusService.instance;
  }

  private startTracking() {
    setInterval(() => {
      this.status.sessionDuration = Math.floor((Date.now() - this.startTime) / 1000);
      this.emit('updated', this.status);
    }, 1000);
  }

  updateMetrics(tokens: number, cost: number) {
    this.status.totalTokens += tokens;
    this.status.totalCostUsd += cost;
    this.emit('updated', this.status);
  }

  setStatus(updates: Partial<HarnessStatus>) {
    this.status = { ...this.status, ...updates };
    this.emit('updated', this.status);
  }

  getStatus(): HarnessStatus {
    return this.status;
  }
}
