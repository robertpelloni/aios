import { McpmRegistry } from './McpmRegistry.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export class McpmInstaller {
    private registry: McpmRegistry;
    private installDir: string;

    constructor(installDir: string) {
        this.registry = new McpmRegistry();
        this.installDir = installDir;
    }

    async install(skillName: string): Promise<string> {
        const results = await this.registry.search(skillName);
        // Exact match preferred
        const match = results.find(r => r.name.toLowerCase() === skillName.toLowerCase()) || results[0];

        if (!match) {
            throw new Error(`Skill '${skillName}' not found in registry.`);
        }

        const targetPath = path.join(this.installDir, match.name);

        // Check if exists
        try {
            await fs.access(targetPath);
            // Check if directory is empty or valid? For now assume valid.
            return `Skill '${match.name}' is already installed at ${targetPath}. (Skipping download)`;
        } catch {
            // Doesn't exist, proceed
        }

        // Create skills dir
        await fs.mkdir(this.installDir, { recursive: true });

        // Clone
        console.log(`[McpmInstaller] Cloning ${match.url} to ${targetPath}...`);
        try {
            await this.runCommand(`git clone ${match.url} "${targetPath}"`);
            return `Successfully installed '${match.name}' from ${match.url}`;
        } catch (e: any) {
            throw new Error(`Failed to clone skill: ${e.message}`);
        }
    }

    async search(query: string) {
        return this.registry.search(query);
    }

    private runCommand(cmd: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const p = spawn(cmd, { shell: true, stdio: 'inherit' });
            p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Command failed: ${cmd}`)));
            p.on('error', reject);
        });
    }
}
