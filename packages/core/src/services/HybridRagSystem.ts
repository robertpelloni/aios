import { HnswIndex } from './HnswIndex.js';
import { BM25Index } from './BM25Index.js';

export interface RagConfig {
  hnswWeight: number;
  bm25Weight: number;
  maxResults: number;
  dimensions: number;
}

export interface RagDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RagSearchResult {
  id: string;
  score: number;
  hnswScore?: number;
  bm25Score?: number;
  metadata?: Record<string, unknown>;
}

export class HybridRagSystem {
  private hnsw: HnswIndex;
  private bm25: BM25Index;
  private config: RagConfig;
  private embeddingFn: ((text: string) => Promise<number[]>) | null = null;

  constructor(config: Partial<RagConfig> = {}) {
    this.config = {
      hnswWeight: config.hnswWeight ?? 0.5,
      bm25Weight: config.bm25Weight ?? 0.5,
      maxResults: config.maxResults ?? 10,
      dimensions: config.dimensions ?? 1536,
    };

    this.hnsw = new HnswIndex({ dimensions: this.config.dimensions });
    this.bm25 = new BM25Index();
    
    this.normalizeWeights();
  }

  private normalizeWeights(): void {
    const total = this.config.hnswWeight + this.config.bm25Weight;
    if (total === 0) {
      this.config.hnswWeight = 0.5;
      this.config.bm25Weight = 0.5;
    } else {
      this.config.hnswWeight /= total;
      this.config.bm25Weight /= total;
    }
  }

  setWeights(hnswWeight: number, bm25Weight: number): void {
    this.config.hnswWeight = hnswWeight;
    this.config.bm25Weight = bm25Weight;
    this.normalizeWeights();
  }

  setEmbeddingFunction(fn: (text: string) => Promise<number[]>): void {
    this.embeddingFn = fn;
  }

  async addDocument(id: string, content: string, vector?: number[], metadata?: Record<string, unknown>): Promise<void> {
    if (!vector && this.embeddingFn) {
      vector = await this.embeddingFn(content);
    }

    if (vector) {
      this.hnsw.add(id, vector, metadata);
    }
    this.bm25.add(id, content, metadata);
  }

  async addDocuments(docs: Array<RagDocument & { vector?: number[] }>): Promise<void> {
    for (const doc of docs) {
      await this.addDocument(doc.id, doc.content, doc.vector, doc.metadata);
    }
  }

  async search(query: string, options: { k?: number } = {}): Promise<RagSearchResult[]> {
    const k = options.k ?? this.config.maxResults;
    const bm25Results = this.bm25.search(query, k * 2);
    
    let hnswResults: any[] = [];
    if (this.embeddingFn) {
      const vector = await this.embeddingFn(query);
      hnswResults = this.hnsw.search(vector, k * 2);
    }

    const allIds = new Set([...bm25Results.map(r => r.id), ...hnswResults.map(r => r.id)]);
    const finalResults: RagSearchResult[] = [];

    const normalizedBm25 = this.normalizeScores(bm25Results);
    const normalizedHnsw = this.normalizeScores(hnswResults);

    for (const id of allIds) {
      const bScore = normalizedBm25.get(id) ?? 0;
      const hScore = normalizedHnsw.get(id) ?? 0;
      
      const score = (hScore * this.config.hnswWeight) + (bScore * this.config.bm25Weight);
      
      if (score > 0) {
        const metadata = this.bm25.getDocument(id)?.metadata || this.hnsw.getNode(id)?.data;
        finalResults.push({
          id,
          score,
          hnswScore: hScore,
          bm25Score: bScore,
          metadata: metadata as Record<string, unknown>,
        });
      }
    }

    return finalResults
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  private normalizeScores(results: Array<{ id: string; score: number }>): Map<string, number> {
    if (results.length === 0) return new Map();
    
    const scores = results.map(r => r.score);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min;

    const normalized = new Map<string, number>();
    for (const result of results) {
      const normalizedScore = range === 0 
        ? (result.score > 0 ? 1.0 : 0.0) 
        : (result.score - min) / range;
      normalized.set(result.id, normalizedScore);
    }
    return normalized;
  }

  async removeDocument(id: string): Promise<boolean> {
    const h = this.hnsw.remove(id);
    const b = this.bm25.remove(id);
    return h || b;
  }

  async clear(): Promise<void> {
    this.hnsw.clear();
    this.bm25.clear();
  }

  getStats(): any {
    return {
      documentCount: this.bm25.size(),
      weights: {
        hnsw: this.config.hnswWeight,
        bm25: this.config.bm25Weight,
      },
      hnsw: this.hnsw.getStats(),
      bm25: this.bm25.getStats(),
    };
  }
}
