
import lancedb from "lancedb";
import path from "path";
import os from "os";

export interface CodeChunk {
    id: string;
    file_path: string;
    content: string;
    language: string;
    start_line: number;
    end_line: number;
    vector: number[];
}

export class VectorStore {
    private db: lancedb.Connection | null = null;
    private table: lancedb.Table | null = null;

    constructor(private dbPath: string = path.join(os.homedir(), ".aios", "lancedb")) { }

    async init() {
        this.db = await lancedb.connect(this.dbPath);
        // Determine existing tables, create if not exist. 
        // Note: LanceDB node API might differ slightly in table listing.
        const tableNames = await this.db.tableNames();
        if (!tableNames.includes("code_chunks")) {
            // Creating a dummy entry to define schema is a common pattern if explicit schema def is tricky depending on version
            // But let's try to just open it if exists, else create with data.
        }
    }

    async createTable(data: CodeChunk[]) {
        if (!this.db) await this.init();
        // Drop if exists for clean state during dev, or append?
        // For now, let's use overwrite logic or create.
        this.table = await this.db!.createTable("code_chunks", data, { mode: "overwrite" });
    }

    async add(data: CodeChunk[]) {
        if (!this.table) {
            await this.createTable(data);
        } else {
            await this.table.add(data);
        }
    }

    async search(queryVector: number[], limit = 5): Promise<CodeChunk[]> {
        if (!this.table) return [];
        const results = await this.table.vectorSearch(queryVector).limit(limit).toArray();
        return results as unknown as CodeChunk[];
    }
}
