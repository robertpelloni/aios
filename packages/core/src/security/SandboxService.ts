
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

    async execute(language: 'python' | 'node', code: string, timeoutMs: number = 5000): Promise<{ output: string; error?: string }> {
        const fileExt = language === 'python' ? 'py' : 'js';
        const fileName = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const hostPath = path.resolve(this.tempDir, fileName);

        // Ensure temp dir exists (just in case)
        if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir, { recursive: true });

        fs.writeFileSync(hostPath, code);

        // Docker Image Selection
        // Use lightweight alpine images.
        // Node: node:18-alpine
        // Python: python:3.10-alpine
        const containerImage = language === 'python' ? 'python:3.10-alpine' : 'node:18-alpine';

        // Command construction
        // logic: Mount host temp dir to /app. Set workdir /app. Run file.
        // We use path.resolve for host path. Windows paths need handling? 
        // Docker for Windows usually handles c:\... fine.
        const runCmd = language === 'python' ? ['python', `/app/${fileName}`] : ['node', `/app/${fileName}`];

        console.log(`[Sandbox] Executing in ${containerImage}...`);

        return new Promise((resolve) => {
            const args = [
                'run', '--rm',
                // Network isolation: none (uncomment to enable internet)
                // '--network', 'none', 
                // Memory limit
                '--memory', '128m',
                // CPU share
                '--cpus', '0.5',
                '-v', `${this.tempDir}:/app`,
                '-w', '/app',
                containerImage,
                ...runCmd
            ];

            const proc = spawn('docker', args);
            let stdout = '';
            let stderr = '';
            let timedOut = false;

            // Timeout Logic
            const timer = setTimeout(() => {
                timedOut = true;
                console.error(`[Sandbox] Timeout! Killing process...`);
                proc.kill(); // SIGTERM
                // Force kill if needed
                setTimeout(() => { if (!proc.killed) proc.kill('SIGKILL'); }, 1000);
            }, timeoutMs);

            proc.stdout.on('data', (d) => stdout += d.toString());
            proc.stderr.on('data', (d) => stderr += d.toString());

            proc.on('close', (code) => {
                clearTimeout(timer);
                // Cleanup file
                try { fs.unlinkSync(hostPath); } catch (e) { }

                if (timedOut) {
                    resolve({ output: stdout.trim(), error: `Execution Timeout (${timeoutMs}ms exceeded)` });
                } else if (code === 0) {
                    resolve({ output: stdout.trim() });
                } else {
                    resolve({ output: stdout.trim(), error: stderr.trim() || `Exited with code ${code}` });
                }
            });

            proc.on('error', (err) => {
                clearTimeout(timer);
                resolve({ output: '', error: `Docker Spawn Error: ${err.message}. Is Docker running?` });
            });
        });
    }
}
