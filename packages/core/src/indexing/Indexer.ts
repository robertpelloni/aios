
import { FileWalker } from './FileWalker.js';
import { CodeParser } from './CodeParser.js';
import { VectorStore, CodeChunk } from './VectorStore.js';
import fs from 'fs/promises';

export class Indexer {
    private walker: FileWalker;
    private parser: CodeParser;
    private store: VectorStore;

    constructor(private rootDir: string) {
        this.walker = new FileWalker(rootDir);
        this.parser = new CodeParser();
        this.store = new VectorStore();
    }

    async index() {
        console.log("Starting index...");
        await this.store.init();

        const files = await this.walker.getFiles(['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx']);
        console.log(`Found ${files.length} files to index.`);

        // Batch processing
        const chunks: CodeChunk[] = [];

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const tree = this.parser.parse(content, file);

                // TODO: Real AST Chunking. For now, 1 file = 1 chunk
                // Mock embedding (384 dimensions for all-MiniLM-L6-v2)
                const mockVector = new Array(384).fill(0).map(() => Math.random());

                chunks.push({
                    id: file,
                    file_path: file,
                    content: content,
                    language: 'typescript', // Detect dynamically
                    start_line: 0,
                    end_line: content.split('\n').length,
                    vector: mockVector
                });
            } catch (e) {
                console.error(`Error indexing ${file}:`, e);
            }
        }

        if (chunks.length > 0) {
            await this.store.add(chunks);
            console.log(`Indexed ${chunks.length} chunks.`);
        }
    }
}
