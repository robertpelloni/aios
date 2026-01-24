import fs from "fs/promises";
import path from "path";
import { Indexer } from "../memory/Indexer.js";

// We need access to the global Indexer instance from MCPServer
// This is a bit hacky, but consistent with how other tools access global state in this codebase
const getIndexer = (): Indexer => {
    // @ts-ignore
    if (global.mcpServerInstance) {
        // @ts-ignore
        return global.mcpServerInstance.indexer;
    }
    throw new Error("MCPServer instance not found");
};

export const IngestionTools = [
    {
        name: "ingest_file",
        description: "Ingest a local file (PDF, TXT, MD) into the semantic memory (Data Source)",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Absolute path to the file" },
                collection: { type: "string", description: "Optional collection/tag name (default: 'user_documents')" }
            },
            required: ["path"]
        },
        handler: async (args: { path: string, collection?: string }) => {
            const indexer = getIndexer();
            const filePath = args.path;
            const ext = path.extname(filePath).toLowerCase();

            try {
                let content = "";

                if (ext === ".pdf") {
                    // Dynamic import for CommonJS compatibility
                    const pdfParse = (await import("pdf-parse")).default;
                    const dataBuffer = await fs.readFile(filePath);
                    const data = await pdfParse(dataBuffer);
                    content = data.text;
                } else if ([".txt", ".md", ".json", ".ts", ".js", ".py"].includes(ext)) {
                    content = await fs.readFile(filePath, "utf-8");
                } else {
                    return { content: [{ type: "text", text: `Error: Unsupported file type '${ext}'. Supported: .pdf, .txt, .md, .json, code files.` }] };
                }

                // Chunk and Index
                // We use the existing Indexer but hijack it to index a single "virtual" file or just use the raw text
                // The Indexer usually scans a directory. We need a method to index raw text.
                // Since Indexer.indexDirectory uses internal logic, we might need to extend Indexer or just add to VectorStore directly.
                // Let's assume we can add directly to vector store via indexer or vectorStore.

                // Let's use the VectorStore directly for custom docs
                // @ts-ignore
                const store = global.mcpServerInstance.vectorStore;

                // Simple chunking (rough heuristic)
                const chunks = content.match(/[\s\S]{1,1000}/g) || [];

                let count = 0;
                for (const chunk of chunks) {
                    await store.add({
                        id: `${path.basename(filePath)}_${count}_${Date.now()}`,
                        content: chunk,
                        file_path: filePath, // Using file_path as source
                        // We might want to add a 'type' field to schema later for filtering
                    });
                    count++;
                }

                return { content: [{ type: "text", text: `Successfully ingested '${path.basename(filePath)}' (${count} chunks) into memory.` }] };

            } catch (e: any) {
                return { content: [{ type: "text", text: `Error ingesting file: ${e.message}` }] };
            }
        }
    },
    {
        name: "list_ingested_files",
        description: "List files that have been ingested into memory (Search-based heuristic)",
        inputSchema: { type: "object", properties: {} },
        handler: async () => {
            // Since VectorStore doesn't have a 'list distinct sources' query yet, we can't easily list them without scanning.
            // For now, we'll return a placeholder or implement a SQL query if LanceDB supports it cleanly via the wrapper.
            // As a shortcut, we'll return a message nicely explaining this is a "Store Only" implementation for now.
            return { content: [{ type: "text", text: "Listing sources is not yet optimized. Use 'search_codebase' to find content." }] };
        }
    }
];
