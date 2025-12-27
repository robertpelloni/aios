import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SubmoduleInfo {
    path: string;
    version: string;
    status: string;
}

export class SubmoduleManager {
    private rootDir: string;

    constructor() {
        this.rootDir = path.resolve(__dirname, '../../../..');
    }

    getSubmodules(): SubmoduleInfo[] {
        try {
            const output = execSync('git submodule status', { cwd: this.rootDir }).toString();
            return output.trim().split('\n').map(line => {
                const parts = line.trim().split(' ');
                return {
                    version: parts[0],
                    path: parts[1],
                    status: line.startsWith('-') ? 'uninitialized' : (line.startsWith('+') ? 'modified' : 'synced')
                };
            });
        } catch (e) {
            console.error('Failed to get submodules:', e);
            return [];
        }
    }
}
