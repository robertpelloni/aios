import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type SyncStatus = 'synced' | 'behind' | 'ahead' | 'diverged' | 'unknown';

export interface SubmoduleInfo {
    path: string;
    version: string;
    status: string;
    syncStatus?: SyncStatus;
}

export class SubmoduleManager {
    private rootDir: string;

    constructor() {
        this.rootDir = path.resolve(__dirname, '../../../..');
    }

    private getSyncStatus(submodulePath: string): SyncStatus {
        try {
            const fullPath = path.join(this.rootDir, submodulePath);
            if (!fs.existsSync(fullPath)) return 'unknown';

            execSync('git fetch origin --quiet', { cwd: fullPath, timeout: 10000, stdio: 'pipe' });
            
            const local = execSync('git rev-parse HEAD', { cwd: fullPath }).toString().trim();
            const remote = execSync('git rev-parse @{u}', { cwd: fullPath, stdio: 'pipe' }).toString().trim();
            
            if (local === remote) return 'synced';
            
            const base = execSync('git merge-base HEAD @{u}', { cwd: fullPath, stdio: 'pipe' }).toString().trim();
            
            if (base === local) return 'behind';
            if (base === remote) return 'ahead';
            return 'diverged';
        } catch {
            return 'unknown';
        }
    }

    getSubmodules(includeSyncStatus = false): SubmoduleInfo[] {
        try {
            const output = execSync('git submodule status', { cwd: this.rootDir }).toString();
            return output.trim().split('\n').filter(line => line.trim()).map(line => {
                const parts = line.trim().split(' ');
                const submodulePath = parts[1];
                const info: SubmoduleInfo = {
                    version: parts[0].replace(/^[-+]/, ''),
                    path: submodulePath,
                    status: line.startsWith('-') ? 'uninitialized' : (line.startsWith('+') ? 'modified' : 'synced')
                };
                
                if (includeSyncStatus && info.status !== 'uninitialized') {
                    info.syncStatus = this.getSyncStatus(submodulePath);
                }
                
                return info;
            });
        } catch (e) {
            console.error('Failed to get submodules:', e);
            return [];
        }
    }

    getSyncStatusForPath(submodulePath: string): SyncStatus {
        return this.getSyncStatus(submodulePath);
    }
}
