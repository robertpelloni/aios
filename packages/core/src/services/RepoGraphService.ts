
import fs from 'fs';
import path from 'path';

export class RepoGraphService {
    private rootDir: string;
    // Map: FilePath -> Set of files that import it (Reverse Dependency)
    private consumers: Map<string, Set<string>> = new Map();
    // Map: FilePath -> Set of files it imports (Forward Dependency)
    private dependencies: Map<string, Set<string>> = new Map();

    private isInitialized: boolean = false;

    constructor(rootDir: string) {
        this.rootDir = rootDir;
    }

    async buildGraph() {
        console.time('RepoGraphBuild');
        const files = await this.getAllFiles(this.rootDir);

        for (const file of files) {
            await this.analyzeFile(file);
        }

        this.isInitialized = true;
        console.timeEnd('RepoGraphBuild');
        console.log(`[RepoGraph] Built graph with ${files.length} files.`);
    }

    getConsumers(filePath: string): string[] {
        if (!this.isInitialized) return [];
        const normalized = this.normalize(filePath);
        const set = this.consumers.get(normalized);
        return set ? Array.from(set) : [];
    }

    private normalize(p: string): string {
        return p.split(path.sep).join('/').replace(/^\.\//, '');
    }

    private async analyzeFile(filePath: string) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const imports = this.extractImports(content);
            const sourceNormalized = this.normalize(filePath);

            for (const imp of imports) {
                // Resolution Logic (Simple relative only for now)
                if (imp.startsWith('.')) {
                    const dir = path.dirname(filePath);
                    let target = path.join(dir, imp);

                    // Add extensions if missing
                    if (!target.endsWith('.ts') && !target.endsWith('.tsx')) {
                        if (fs.existsSync(target + '.ts')) target += '.ts';
                        else if (fs.existsSync(target + '.tsx')) target += '.tsx';
                        else if (fs.existsSync(target + '/index.ts')) target += '/index.ts';
                    }

                    if (fs.existsSync(target)) {
                        const targetNormalized = this.normalize(target);

                        // Add Forward
                        if (!this.dependencies.has(sourceNormalized)) this.dependencies.set(sourceNormalized, new Set());
                        this.dependencies.get(sourceNormalized)!.add(targetNormalized);

                        // Add Reverse (Consumer)
                        if (!this.consumers.has(targetNormalized)) this.consumers.set(targetNormalized, new Set());
                        this.consumers.get(targetNormalized)!.add(sourceNormalized);
                    }
                }
            }
        } catch (e) {
            // ignore read errors
        }
    }

    private extractImports(content: string): string[] {
        const regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        // Dynamic imports? import(...)
        return matches;
    }

    private async getAllFiles(dir: string): Promise<string[]> {
        let results: string[] = [];
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const p = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
                results = results.concat(await this.getAllFiles(p));
            } else {
                if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
                    results.push(p);
                }
            }
        }
        return results;
    }
    toJSON() {
        return {
            consumers: Object.fromEntries(
                Array.from(this.consumers.entries()).map(([k, v]) => [k, Array.from(v)])
            ),
            dependencies: Object.fromEntries(
                Array.from(this.dependencies.entries()).map(([k, v]) => [k, Array.from(v)])
            )
        };
    }
}
