import * as fs from 'fs';
import * as path from 'path';

export class ContextManager {
    private pinnedFiles: Set<string> = new Set();
    private maxTokenLimit: number = 8000; // Rough char limit for now

    constructor() { }

    public add(filePath: string): string {
        const absolutePath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        if (fs.statSync(absolutePath).isDirectory()) {
            throw new Error(`Cannot pin directory: ${filePath}`);
        }

        this.pinnedFiles.add(absolutePath);
        return `📌 Pinned: ${path.basename(absolutePath)}`;
    }

    public remove(filePath: string): string {
        const absolutePath = path.resolve(process.cwd(), filePath);
        // Try exact match first
        if (this.pinnedFiles.has(absolutePath)) {
            this.pinnedFiles.delete(absolutePath);
            return `🗑️ Unpinned: ${path.basename(absolutePath)}`;
        }

        // Try fuzzy match on basename
        for (const file of this.pinnedFiles) {
            if (path.basename(file) === filePath) {
                this.pinnedFiles.delete(file);
                return `🗑️ Unpinned: ${path.basename(file)}`;
            }
        }

        return `File not found in pinned context: ${filePath}`;
    }

    public list(): string[] {
        return Array.from(this.pinnedFiles);
    }

    public clear(): string {
        const count = this.pinnedFiles.size;
        this.pinnedFiles.clear();
        return `Cleared ${count} pinned files.`;
    }

    public getContextPrompt(): string {
        if (this.pinnedFiles.size === 0) return "";

        let context = "📌 **PINNED CONTEXT (High Priority)**\n\n";

        for (const file of this.pinnedFiles) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                // Basic truncation to prevent exploding context
                const truncated = content.length > 20000 ? content.substring(0, 20000) + "\n... (truncated)" : content;

                context += `file: ${path.basename(file)}\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
            } catch (e: any) {
                context += `file: ${path.basename(file)} (Error reading: ${e.message})\n\n`;
            }
        }

        return context;
    }
}
