
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class SandboxService {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'borg-sandbox');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async execute(language: 'python' | 'node', code: string): Promise<{ output: string; error?: string }> {
        const fileExt = language === 'python' ? 'py' : 'js';
        const fileName = `exec_${Date.now()}.${fileExt}`;
        const hostPath = path.join(this.tempDir, fileName);

        fs.writeFileSync(hostPath, code);

        const containerImage = language === 'python' ? 'python:3.10-alpine' : 'node:18-alpine';
        const runCmd = language === 'python' ? ['python', `/app/${fileName}`] : ['node', `/app/${fileName}`];

        console.log(`[Sandbox] Executing in ${containerImage}...`);

        return new Promise((resolve) => {
            // Docker: Mount tempDir to /app, run script
            // docker run --rm -v "C:\Users\foo\tmp\borg:/app" -w /app python:alpine python script.py

            const args = [
                'run', '--rm',
                '-v', `${this.tempDir}:/app`,
                '-w', '/app',
                containerImage,
                ...runCmd
            ];

            const proc = spawn('docker', args);
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (d) => stdout += d.toString());
            proc.stderr.on('data', (d) => stderr += d.toString());

            proc.on('close', (code) => {
                // Cleanup
                try { fs.unlinkSync(hostPath); } catch (e) { }

                if (code === 0) {
                    resolve({ output: stdout.trim() });
                } else {
                    resolve({ output: stdout.trim(), error: stderr.trim() || `Exited with code ${code}` });
                }
            });

            proc.on('error', (err) => {
                resolve({ output: '', error: `Docker Spawn Error: ${err.message}` });
            });
        });
    }
}
