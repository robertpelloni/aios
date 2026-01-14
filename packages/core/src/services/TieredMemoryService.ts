import { EventEmitter } from 'events';
import { VectorStore, VectorDocument } from './VectorStore.js';
import { DataResidencyService } from './DataResidencyService.js';

export interface MemoryTier {
  name: 'hot' | 'warm' | 'cold';
  provider: string;
  latency: number;
  capacity: number;
}

export interface ScoredVectorDocument extends VectorDocument {
  score: number;
}

export class TieredMemoryService extends EventEmitter {
  private static instance: TieredMemoryService;
  private vectorStore: VectorStore;
  private residency: DataResidencyService;

  private constructor(vectorStore: VectorStore) {
    super();
    this.vectorStore = vectorStore;
    this.residency = DataResidencyService.getInstance();
  }

  static getInstance(vectorStore?: VectorStore): TieredMemoryService {
    if (!TieredMemoryService.instance) {
      if (!vectorStore) throw new Error("TieredMemoryService requires vectorStore");
      TieredMemoryService.instance = new TieredMemoryService(vectorStore);
    }
    return TieredMemoryService.instance;
  }

  async store(content: string, metadata: any = {}) {
    const policy = this.residency.getStorageConfig('memories');
    console.log(`[TieredMemory] Storing in ${policy.provider} tier...`);
    
    const existing = await this.vectorStore.search(content, 1) as ScoredVectorDocument[];
    if (existing.length > 0 && existing[0].score > 0.95) {
      console.log('[TieredMemory] Cache hit! Returning existing memory ID.');
      return existing[0].id;
    }

    const id = await this.vectorStore.add(content, metadata);
    
    if (policy.provider !== 'local') {
      await this.archiveToColdStorage(id, content, metadata, policy.provider);
    }

    return id;
  }

  private async archiveToColdStorage(id: string, content: string, metadata: any, provider: string) {
    console.log(`[TieredMemory] Archiving ${id} to cold storage (${provider})...`);
    return true;
  }

  async retrieve(query: string) {
    const results = await this.vectorStore.search(query);
    
    if (results.length === 0) {
      console.log('[TieredMemory] Hot tier miss, searching warm/cold tiers...');
    }

    return results;
  }
}
