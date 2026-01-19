
# Code Indexing Service Design

## Goal
To maintain a real-time, queryable index of the local codebase using AST-based chunking and vector embeddings.

## Architecture

### 1. File Walker (`FileWalker.ts`)
- **Input:** Root directory path.
- **Output:** Stream of file paths.
- **Filtering:** Respects `.gitignore` and common exclusion patterns (`node_modules`, `dist`, `.git`).
- **Tech:** `fast-glob` or `ignore` package.

### 2. AST Parser (`CodeParser.ts`)
- **Input:** File content + Language ID.
- **Output:** Tree-sitter AST.
- **Chunking:**
    - Split by functions/classes.
    - Preserve context (parent class name, file path).
- **Tech:** `tree-sitter`, `tree-sitter-typescript`, `tree-sitter-python`.

### 3. Vector Store (`VectorStore.ts`)
- **Backend:** `lancedb` (embedded, serverless).
- **Schema:**
    ```typescript
    interface CodeChunk {
      id: string; // file_path + line_start
      file_path: string;
      content: string;
      language: string;
      start_line: number;
      end_line: number;
      vector: number[]; // Embedding
    }
    ```

### 4. Indexer Manager (`Indexer.ts`)
- **Orchestrator:**
    - Watches file changes (Chokidar - *Future*).
    - Triggers Walker -> Parser -> Embedder -> Store pipeline.
    - Exposes `search(query: string)` method.

## Embeddings
- **Initial:** `Xenova/all-MiniLM-L6-v2` (running locally via ONNX/Transformers.js) OR simplified placeholder using standard API.
- **Goal:** Local-first, zero-cost.

## API Exposure
- `mcp_server.tool("search_codebase", { query: string })`
