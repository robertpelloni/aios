import fs from 'fs/promises';
import path from 'path';
import os from 'os';
export class MarketplaceService {
    cachePath = path.join(os.homedir(), '.borg', 'marketplace_cache.json');
    // Using a popular awesome list as the source
    sourceUrl = 'https://raw.githubusercontent.com/wong2/awesome-mcp-servers/main/README.md';
    constructor() {
        this.ensureCacheDir();
    }
    async ensureCacheDir() {
        try {
            await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
        }
        catch (e) { }
    }
    async updateIndex() {
        console.log(`[Marketplace] Fetching index from ${this.sourceUrl}...`);
        try {
            const response = await fetch(this.sourceUrl);
            if (!response.ok)
                throw new Error(`Failed to fetch: ${response.statusText}`);
            const text = await response.text();
            const items = this.parseReadme(text);
            await fs.writeFile(this.cachePath, JSON.stringify(items, null, 2), 'utf-8');
            console.log(`[Marketplace] Updated index with ${items.length} servers.`);
            return items;
        }
        catch (e) {
            console.error(`[Marketplace] Update failed: ${e.message}`);
            return [];
        }
    }
    async getIndex() {
        try {
            const data = await fs.readFile(this.cachePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (e) {
            // If missing, try to fetch
            return await this.updateIndex();
        }
    }
    parseReadme(markdown) {
        const items = [];
        const lines = markdown.split('\n');
        // Simple regex to find list items with links: "- [Name](URL) - Description"
        // Adjust regex based on actual format of the README
        const linkRegex = /-\s*\[([^\]]+)\]\(([^)]+)\)\s*-\s*(.+)/;
        for (const line of lines) {
            const match = line.match(linkRegex);
            if (match) {
                const name = match[1].trim();
                const url = match[2].trim();
                const description = match[3].trim();
                // Simple heuristic for install command
                let installCommand = undefined;
                if (url.includes("github.com")) {
                    // Check description for hints
                    if (description.includes("npx")) {
                        // Extract npx command? Too risky.
                        // Just use generic npx if the repo name looks package-like?
                    }
                }
                items.push({
                    name,
                    url,
                    description,
                    source: 'community',
                    installCommand
                });
            }
        }
        return items;
    }
}
