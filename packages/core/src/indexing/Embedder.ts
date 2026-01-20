
import { pipeline, Pipeline } from '@xenova/transformers';

export class Embedder {
    private static instance: Embedder;
    private pipe: Pipeline | null = null;
    private modelName = 'Xenova/all-MiniLM-L6-v2';

    private constructor() { }

    static getInstance(): Embedder {
        if (!Embedder.instance) {
            Embedder.instance = new Embedder();
        }
        return Embedder.instance;
    }

    async init() {
        if (!this.pipe) {
            console.log(`Loading embedding model: ${this.modelName}...`);
            this.pipe = await pipeline('feature-extraction', this.modelName) as any;
            console.log('Model loaded.');
        }
    }

    async embed(text: string): Promise<number[]> {
        if (!this.pipe) {
            await this.init();
        }
        const output = await this.pipe!(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }
}
