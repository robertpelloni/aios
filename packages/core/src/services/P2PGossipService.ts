import { EventEmitter } from 'events';
import type { Server as SocketIOServer, Socket } from 'socket.io';

export interface GossipMetadata {
  nodeId: string;
  key: string;
  value: any;
  version: number;
  timestamp: number;
}

export class P2PGossipService extends EventEmitter {
  private static instance: P2PGossipService;
  private store = new Map<string, { value: any; version: number }>();
  private io: SocketIOServer | null = null;
  private nodeId: string;
  private interval?: NodeJS.Timeout;

  private constructor(nodeId: string) {
    super();
    this.nodeId = nodeId;
  }

  static getInstance(nodeId?: string): P2PGossipService {
    if (!P2PGossipService.instance) {
      if (!nodeId) throw new Error("P2PGossipService requires nodeId for initialization");
      P2PGossipService.instance = new P2PGossipService(nodeId);
    }
    return P2PGossipService.instance;
  }

  setSocketServer(io: SocketIOServer) {
    this.io = io;
    this.setupHandlers();
    this.startGossiping(5000); // 5-second interval
  }

  private setupHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      // Listen for gossip from peers
      socket.on('gossip:metadata', (msg: GossipMetadata) => {
        this.receiveGossip(msg);
      });

      // Sync state with new peer
      socket.emit('gossip:state', Array.from(this.store.entries()));
    });
  }

  private startGossiping(intervalMs: number) {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      this.gossipRandomPeers();
    }, intervalMs);
  }

  private gossipRandomPeers() {
    if (!this.io) return;

    const sockets = Array.from(this.io.sockets.sockets.values());
    if (sockets.length === 0) return;

    // Select 3 random peers (fanout factor)
    const targets = this.shuffleArray(sockets).slice(0, 3);
    const summary = this.getSummary();

    targets.forEach(socket => {
      socket.emit('gossip:metadata', summary);
    });
  }

  private receiveGossip(msg: GossipMetadata) {
    // If it's a full state update (key === 'all')
    if (msg.key === 'all' && typeof msg.value === 'object') {
      let changed = false;
      for (const [key, entry] of Object.entries(msg.value as Record<string, { value: any; version: number }>)) {
        const current = this.store.get(key);
        if (!current || entry.version > current.version) {
          this.store.set(key, entry);
          changed = true;
        }
      }
      if (changed) this.emit('updated', Object.fromEntries(this.store));
      return;
    }

    // Single key update
    const current = this.store.get(msg.key);
    if (!current || msg.version > current.version) {
      this.store.set(msg.key, { value: msg.value, version: msg.version });
      this.emit('metadataUpdated', msg);
    }
  }

  public set(key: string, value: any) {
    const current = this.store.get(key) || { version: 0 };
    const newVersion = current.version + 1;
    this.store.set(key, { value, version: newVersion });
    
    // Proactively gossip about this update
    if (this.io) {
      const msg: GossipMetadata = {
        nodeId: this.nodeId,
        key,
        value,
        version: newVersion,
        timestamp: Date.now()
      };
      this.io.emit('gossip:metadata', msg);
    }
  }

  public get(key: string): any {
    return this.store.get(key)?.value;
  }

  public getAll(): Record<string, any> {
    return Object.fromEntries(
      Array.from(this.store.entries()).map(([k, v]) => [k, v.value])
    );
  }

  private getSummary(): GossipMetadata {
    return {
      nodeId: this.nodeId,
      key: 'all',
      value: Object.fromEntries(this.store),
      version: Math.max(0, ...Array.from(this.store.values()).map(v => v.version)),
      timestamp: Date.now()
    };
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }
}
