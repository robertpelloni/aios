import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

export interface ContextOptions {
  redisUrl?: string;
  ttl?: number;
}

export class GlobalContextService extends EventEmitter {
  private static instance: GlobalContextService;
  private redis: Redis | null = null;
  private ttl: number;

  private constructor(options: ContextOptions = {}) {
    super();
    this.ttl = options.ttl || 3600;
    if (options.redisUrl) {
      this.redis = new Redis(options.redisUrl);
      console.log(`[GlobalContext] Connected to Redis at ${options.redisUrl}`);
    } else {
      console.warn('[GlobalContext] Redis URL not provided. Running in Local Mode.');
    }
  }

  static getInstance(options?: ContextOptions): GlobalContextService {
    if (!GlobalContextService.instance) {
      GlobalContextService.instance = new GlobalContextService(options);
    }
    return GlobalContextService.instance;
  }

  async set(key: string, value: any, ttl?: number) {
    const data = JSON.stringify(value);
    if (this.redis) {
      await this.redis.set(key, data, 'EX', ttl || this.ttl);
    } else {
      // Fallback or local cache could be implemented here
      console.log(`[GlobalContext] Local Set: ${key}`);
    }
    this.emit('change', { key, action: 'set' });
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  async delete(key: string) {
    if (this.redis) {
      await this.redis.del(key);
    }
    this.emit('change', { key, action: 'delete' });
  }

  async publish(channel: string, message: any) {
    if (this.redis) {
      await this.redis.publish(channel, JSON.stringify(message));
    }
  }

  async subscribe(channel: string, callback: (message: any) => void) {
    if (this.redis) {
      const sub = this.redis.duplicate();
      await sub.subscribe(channel);
      sub.on('message', (chan, msg) => {
        if (chan === channel) {
          callback(JSON.parse(msg));
        }
      });
    }
  }
}
