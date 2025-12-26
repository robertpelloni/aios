import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { SystemDoctor } from './SystemDoctor.js';

export class DockerService extends EventEmitter {
    private isDockerAvailable: boolean = false;

    constructor(private doctor: SystemDoctor) {
        super();
        this.checkDocker();
    }

    private async checkDocker() {
        const checks = await this.doctor.checkAll();
        const dockerCheck = checks.find(c => c.name === 'docker');
        this.isDockerAvailable = dockerCheck?.status === 'ok';
    }

    async runContainer(image: string, command: string[], input?: string): Promise<{ stdout: string, stderr: string, exitCode: number }> {
        if (!this.isDockerAvailable) {
            throw new Error("Docker is not available on this system.");
        }

        return new Promise((resolve, reject) => {
            // Run ephemeral container
            // --rm: remove container after exit
            // -i: interactive (keep stdin open)
            const args = ['run', '--rm', '-i', image, ...command];

            const process = spawn('docker', args);
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => stdout += data.toString());
            process.stderr.on('data', (data) => stderr += data.toString());

            if (input) {
                process.stdin.write(input);
                process.stdin.end();
            }

            process.on('close', (code) => {
                resolve({ stdout, stderr, exitCode: code || 0 });
            });

            process.on('error', (err) => {
                reject(err);
            });
        });
    }

    async executePython(script: string): Promise<string> {
        // Run python script inside python:3.10-slim
        // We pass the script via stdin to python -c "..." or just python -
        const { stdout, stderr, exitCode } = await this.runContainer('python:3.10-slim', ['python3', '-c', script]);

        if (exitCode !== 0) {
            throw new Error(`Python execution failed (Exit ${exitCode}):\n${stderr}`);
        }
        return stdout + (stderr ? `\n[Stderr]: ${stderr}` : '');
    }
}
