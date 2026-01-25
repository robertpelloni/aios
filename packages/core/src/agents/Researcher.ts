
import { MCPServer } from '../MCPServer.js';
import fs from 'fs';
import path from 'path';

interface ResearchTarget {
    name: string;
    url: string;
    description: string;
    category: string;
}

export class Researcher {
    private server: MCPServer;
    private queue: ResearchTarget[] = [];
    private processed: Set<string> = new Set();
    private outputPath: string;

    constructor(server: MCPServer) {
        this.server = server;
        this.outputPath = path.join(process.cwd(), 'packages', 'core', 'data', 'raw_skills');
    }

    async loadQueue(csvPath: string) {
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').slice(1); // Skip header

        for (const line of lines) {
            // Simple parsing (assume no internal commas for MVP)
            const [name, url, desc, category] = line.split(',').map(s => s?.trim());
            if (name && url && url.startsWith('http')) {
                this.queue.push({ name, url, description: desc || '', category: category || 'Uncategorized' });
            }
        }
        console.log(`[Researcher] Loaded ${this.queue.length} targets.`);
    }

    async start(limit: number = 5) {
        console.log(`[Researcher] Starting batch of ${limit}...`);

        let count = 0;
        while (count < limit && this.queue.length > 0) {
            const target = this.queue.shift()!;
            if (this.processed.has(target.url)) continue;

            await this.processTarget(target);
            this.processed.add(target.url);
            count++;
        }
        console.log("[Researcher] Batch complete.");
    }

    private async processTarget(target: ResearchTarget) {
        console.log(`[Researcher] Analyzing: ${target.name} (${target.url})`);

        try {
            // 1. Scrape (Simulated via scrape tool or fetch)
            // We use the Director's toolset if available, or just fetch if simple.
            // Let's assume we use a 'read_url' tool if we have one, or just fetch for now.
            // Since we built the Browser Extension, we might want to use that if connected.
            // But for reliability in this script, let's use a basic fetch-to-markdown convert.

            const response = await fetch(target.url);
            const html = await response.text();
            // Simple text extraction
            const text = html.replace(/<[^>]+>/g, ' ').substring(0, 5000);

            // 2. Synthesize using LLM (via Director chat or direct model)
            // We need to ask the LLM: "Extract tool capabilities from this text into JSON"
            // We'll use the Director's chat for this to leverage the existing LLM connection.
            // Or better, directly use ModelSelector if we want to be "pure". 
            // Let's use Director.

            const prompt = `
                I am researching a tool called "${target.name}".
                URL: ${target.url}
                Description: ${target.description}
                
                Content:
                ${text}
                
                Output valid JSON identifying 2-3 MCP tools that this service could provide.
                Schema:
                {
                    "name": "${target.name}",
                    "description": "...",
                    "tools": [
                        { "name": "...", "description": "...", "inputSchema": { ... } }
                    ]
                }
            `;

            // Simulating LLM call for this MVP step (since I can't await Director easily here without complex setup)
            // In a real run, this would call server.modelSelector.selectModel().chat(...)
            // For now, we create a stub file.

            const skillDef = {
                name: target.name,
                description: target.description,
                category: target.category,
                tools: [
                    {
                        name: `${target.name.toLowerCase()}_info`,
                        description: `Get info about ${target.name}`,
                        inputSchema: { type: "object", properties: {} }
                    }
                ],
                _source: target.url,
                _researchedAt: new Date().toISOString()
            };

            // 3. Save
            const safeName = target.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const catDir = path.join(this.outputPath, target.category.replace(/[^a-z0-9]/gi, '_'));
            if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

            fs.writeFileSync(
                path.join(catDir, `${safeName}.json`),
                JSON.stringify(skillDef, null, 2)
            );
            console.log(`[Researcher] Saved ${safeName}.json`);

        } catch (e) {
            console.error(`[Researcher] Failed to process ${target.name}:`, e);
        }
    }
}
