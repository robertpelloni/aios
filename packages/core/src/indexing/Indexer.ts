
import { FileWalker } from './FileWalker.js';
import { CodeParser } from './CodeParser.js';
import { VectorStore, CodeChunk } from './VectorStore.js';
import { Embedder } from './Embedder.js';
import fs from 'fs/promises';

export class Indexer {
    private walker: FileWalker;
    private parser: CodeParser;
    private store: VectorStore;
    private embedder: Embedder;

    constructor(private rootDir: string) {
        this.walker = new FileWalker(rootDir);
        this.parser = new CodeParser();
        this.store = new VectorStore();
        this.embedder = Embedder.getInstance();
    }

    async index() {
        console.log("Starting index...");
        await this.store.init();
        await this.embedder.init();

        const files = await this.walker.getFiles(['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx']);
        console.log(`Found ${files.length} files to index.`);

        // Batch processing
        const chunks: CodeChunk[] = [];

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const tree = this.parser.parse(content, file);

                // Real embedding
                const vector = await this.embedder.embed(content);

                chunks.push({
                    id: file,
                    file_path: file,
                    content: content,
                    language: 'typescript', // Detect dynamically
                    start_line: 0,
                    end_line: content.split('\n').length,
                    vector: vector
                });
                console.log(`Indexed ${file}`);
            } catch (e) {
                console.error(`Error indexing ${file}:`, e);
            }
        }

        if (chunks.length > 0) {
            await this.store.add(chunks);
            console.log(`Indexed ${chunks.length} chunks.`);
        }
    }

    async search(query: string, limit = 5): Promise<CodeChunk[]> {
        const vector = await this.embedder.embed(query);
        return this.store.search(vector, limit);
    }
}
