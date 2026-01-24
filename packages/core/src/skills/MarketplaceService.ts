import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface MarketplaceItem {
    name: string;
    url: string;
    description: string;
    source: 'community' | 'official';
    installCommand?: string;
}

export class MarketplaceService {
    private cachePath = path.join(os.homedir(), '.borg', 'marketplace_cache.json');
    // Using a popular awesome list as the source
    private sourceUrl = 'https://raw.githubusercontent.com/wong2/awesome-mcp-servers/main/README.md';

    constructor() {
        this.ensureCacheDir();
    }

    private async ensureCacheDir() {
        try {
            await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
        } catch (e) { }
    }

    async updateIndex(): Promise<MarketplaceItem[]> {
        console.log(`[Marketplace] Fetching index from ${this.sourceUrl}...`);
        try {
            const response = await fetch(this.sourceUrl);
            if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
            const text = await response.text();

            const items = this.parseReadme(text);

            await fs.writeFile(this.cachePath, JSON.stringify(items, null, 2), 'utf-8');
            console.log(`[Marketplace] Updated index with ${items.length} servers.`);
            return items;
        } catch (e: any) {
            console.error(`[Marketplace] Update failed: ${e.message}`);
            return [];
        }
    }

    async getIndex(): Promise<MarketplaceItem[]> {
        try {
            const data = await fs.readFile(this.cachePath, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            // If missing, try to fetch
            return await this.updateIndex();
        }
    }

    private parseReadme(markdown: string): MarketplaceItem[] {
        const items: MarketplaceItem[] = [];
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
