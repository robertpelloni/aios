
import fs from 'fs/promises';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RegistryItem {
    name: string;
    url: string;
    tags?: string[];
}

export class McpmRegistry {
    private dataPath: string;
    private cache: any = null;

    constructor() {
        // Point to skills_registry.json in ../data
        this.dataPath = path.join(__dirname, '../../data/skills_registry.json');
    }

    async load(): Promise<any> {
        if (this.cache) return this.cache;

        try {
            const content = await fs.readFile(this.dataPath, 'utf-8');
            this.cache = JSON.parse(content);
            return this.cache;
        } catch (error) {
            console.error("Failed to load MCP Registry:", error);
            return { directories: [], skills: [] };
        }
    }

    async search(query: string): Promise<RegistryItem[]> {
        const data = await this.load();
        const allItems = [...(data.directories || []), ...(data.skills || [])];

        return allItems.filter(item =>
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            (item.tags && item.tags.some((t: string) => t.includes(query.toLowerCase())))
        );
    }

    async listCategories() {
        const data = await this.load();
        return Object.keys(data);
    }
}
