import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

export class VibeKanbanManager extends EventEmitter {
    private process: ChildProcess | null = null;
    private projectRoot: string;
    private frontendPort: number = 3001;
    private backendPort: number = 8080;

    constructor(projectRoot: string) {
        super();
        this.projectRoot = projectRoot;
    }

    async start(frontendPort: number = 3001, backendPort: number = 8080): Promise<void> {
        if (this.process) {
             throw new Error("Vibe Kanban is already running.");
        }
        this.frontendPort = frontendPort;
        this.backendPort = backendPort;

        const cliPath = path.join(this.projectRoot, 'submodules', 'vibe-kanban', 'npx-cli', 'bin', 'cli.js');
        const cwd = path.join(this.projectRoot, 'submodules', 'vibe-kanban');

        console.log(`[VibeKanban] Starting...`);
        console.log(`[VibeKanban] Script: ${cliPath}`);
        console.log(`[VibeKanban] CWD: ${cwd}`);

        this.process = spawn('node', [cliPath], {
            cwd: cwd,
            env: {
                ...process.env,
                FRONTEND_PORT: this.frontendPort.toString(),
                BACKEND_PORT: this.backendPort.toString(),
                HOST: '0.0.0.0',
                FORCE_COLOR: '1'
            }
        });

        this.process.stdout?.on('data', (data) => {
            console.log(`[VibeKanban] ${data}`);
        });

        this.process.stderr?.on('data', (data) => {
            console.error(`[VibeKanban Error] ${data}`);
        });

        this.process.on('close', (code) => {
            console.log(`[VibeKanban] Exited with code ${code}`);
            this.process = null;
            this.emit('stopped', code);
        });
        
        console.log(`[VibeKanban] Started on ports FE:${frontendPort} BE:${backendPort}`);
    }

    async stop(): Promise<void> {
        if (this.process) {
            this.process.kill();
            this.process = null;
            console.log(`[VibeKanban] Stopped`);
        }
    }

    getStatus() {
        return {
            running: !!this.process,
            pid: this.process?.pid,
            frontendPort: this.frontendPort,
            backendPort: this.backendPort
        };
    }
}
