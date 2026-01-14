import { EventEmitter } from 'events';
import { AgentExecutor } from '../agents/AgentExecutor.js';
import { QueueService, getQueueService } from './QueueService.js';

export interface BatchJob {
  id: string;
  tasks: string[];
  agentName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: any[];
  progress: number;
}

export class BatchProcessingService extends EventEmitter {
  private static instance: BatchProcessingService;
  private queue: QueueService;
  private activeBatches: Map<string, BatchJob> = new Map();

  private constructor(private agentExecutor: AgentExecutor) {
    super();
    this.queue = getQueueService();
  }

  static getInstance(agentExecutor?: AgentExecutor): BatchProcessingService {
    if (!BatchProcessingService.instance) {
      if (!agentExecutor) throw new Error("BatchProcessingService requires agentExecutor");
      BatchProcessingService.instance = new BatchProcessingService(agentExecutor);
    }
    return BatchProcessingService.instance;
  }

  async createBatch(agentName: string, tasks: string[]): Promise<string> {
    const id = `batch_${Date.now()}`;
    const batch: BatchJob = {
      id,
      tasks,
      agentName,
      status: 'pending',
      results: [],
      progress: 0
    };

    this.activeBatches.set(id, batch);
    
    // Start processing in background
    this.processBatch(id);
    
    return id;
  }

  private async processBatch(batchId: string) {
    const batch = this.activeBatches.get(batchId);
    if (!batch) return;

    batch.status = 'processing';
    this.emit('batchUpdated', batch);

    const agents = (this.agentExecutor as any).agentManager.getAgents();
    const agent = agents.find((a: any) => a.name === batch.agentName);

    if (!agent) {
      batch.status = 'failed';
      this.emit('batchUpdated', batch);
      return;
    }

    for (let i = 0; i < batch.tasks.length; i++) {
      const taskText = batch.tasks[i];
      try {
        console.log(`[Batch] Executing task ${i+1}/${batch.tasks.length} for batch ${batchId}`);
        const result = await this.agentExecutor.run(agent, taskText, {}, `${batchId}-${i}`);
        batch.results.push({ task: taskText, result, status: 'success' });
      } catch (err: any) {
        batch.results.push({ task: taskText, error: err.message, status: 'failed' });
      }
      
      batch.progress = Math.round(((i + 1) / batch.tasks.length) * 100);
      this.emit('batchUpdated', batch);
    }

    batch.status = 'completed';
    this.emit('batchUpdated', batch);
  }

  getBatch(id: string): BatchJob | undefined {
    return this.activeBatches.get(id);
  }

  listBatches(): BatchJob[] {
    return Array.from(this.activeBatches.values());
  }
}
