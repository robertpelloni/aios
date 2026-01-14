import { EventEmitter } from 'events';
import { LogManager } from '../managers/LogManager.js';
import fs from 'fs/promises';
import path from 'path';

export interface TrafficFrame {
  id?: string;
  timestamp: number;
  direction: 'request' | 'response' | 'notification';
  serverId: string;
  method?: string;
  data: any;
  latency?: number;
  correlatedId?: string; // Links request <-> response
}

export interface TrafficFilter {
  serverId?: string;
  method?: string;
  direction?: 'request' | 'response' | 'notification';
  startTime?: number;
  endTime?: number;
}

export class TrafficInspectionService extends EventEmitter {
  private static instance: TrafficInspectionService;
  private frames: TrafficFrame[] = [];
  private pendingRequests: Map<string | number, { startTime: number, frameId: string }> = new Map();
  private readonly MAX_FRAMES = 5000;
  private persistenceDir: string;

  private constructor(private logManager: LogManager) {
    super();
    this.persistenceDir = path.join(process.cwd(), 'logs', 'traffic');
    this.setupListeners();
    this.initPersistence();
  }

  static getInstance(logManager?: LogManager): TrafficInspectionService {
    if (!TrafficInspectionService.instance) {
      if (!logManager) throw new Error("TrafficInspectionService requires logManager");
      TrafficInspectionService.instance = new TrafficInspectionService(logManager);
    }
    return TrafficInspectionService.instance;
  }

  private async initPersistence() {
    try {
      await fs.mkdir(this.persistenceDir, { recursive: true });
    } catch (e) {
      console.error('[TrafficInspector] Failed to init persistence dir:', e);
    }
  }

  private setupListeners() {
    this.logManager.on('log', (log) => {
       // LogManager events are handled here if needed for redundancy
    });
  }

  public addFrame(frame: TrafficFrame) {
    const enrichedFrame = { ...frame, id: frame.id || crypto.randomUUID() };
    
    // Correlation Logic: Link requests to responses for latency tracking
    if (frame.data?.id) {
      if (frame.direction === 'request') {
        this.pendingRequests.set(frame.data.id, { 
          startTime: frame.timestamp, 
          frameId: enrichedFrame.id 
        });
      } else if (frame.direction === 'response') {
        const req = this.pendingRequests.get(frame.data.id);
        if (req) {
          enrichedFrame.latency = frame.timestamp - req.startTime;
          enrichedFrame.correlatedId = req.frameId;
          
          const reqFrame = this.frames.find(f => f.id === req.frameId);
          if (reqFrame) {
            reqFrame.latency = enrichedFrame.latency;
            reqFrame.correlatedId = enrichedFrame.id;
          }
          
          this.pendingRequests.delete(frame.data.id);
        }
      }
    }

    this.frames.push(enrichedFrame);
    if (this.frames.length > this.MAX_FRAMES) {
      this.frames.shift();
    }
    
    this.persistFrame(enrichedFrame);
    this.emit('frame', enrichedFrame);
  }

  private async persistFrame(frame: TrafficFrame) {
    const logFile = path.join(this.persistenceDir, `traffic-${new Date().toISOString().split('T')[0]}.jsonl`);
    try {
      await fs.appendFile(logFile, JSON.stringify(frame) + '\n');
    } catch (e) {
      console.error('[TrafficInspector] Failed to persist frame:', e);
    }
  }

  getFrames(filter?: TrafficFilter) {
    if (!filter) return this.frames;

    return this.frames.filter(f => {
      if (filter.serverId && f.serverId !== filter.serverId) return false;
      if (filter.method && f.method !== filter.method) return false;
      if (filter.direction && f.direction !== filter.direction) return false;
      if (filter.startTime && f.timestamp < filter.startTime) return false;
      if (filter.endTime && f.timestamp > filter.endTime) return false;
      return true;
    });
  }

  clear() {
    this.frames = [];
    this.emit('cleared');
  }
}
