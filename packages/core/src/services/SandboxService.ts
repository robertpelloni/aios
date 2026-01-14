import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { SystemDoctor } from './SystemDoctor.js';

export type SandboxRuntime = 'docker' | 'wasm' | 'isolate' | 'process';

export interface SandboxOptions {
  runtime: SandboxRuntime;
  image?: string;
  timeout?: number;
  memoryLimit?: number;
  cpuLimit?: number;
  networkAccess?: boolean;
}

export class SandboxService extends EventEmitter {
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

  async run(command: string[], options: SandboxOptions, input?: string): Promise<{ stdout: string, stderr: string, exitCode: number }> {
    switch (options.runtime) {
      case 'docker':
        return this.runDocker(command, options, input);
      case 'wasm':
        return this.runWasm(command, options, input);
      case 'isolate':
        throw new Error("Isolate runtime not yet implemented in SandboxService.");
      case 'process':
      default:
        return this.runLocalProcess(command, options, input);
    }
  }

  private async runDocker(command: string[], options: SandboxOptions, input?: string): Promise<{ stdout: string, stderr: string, exitCode: number }> {
    if (!this.isDockerAvailable) throw new Error("Docker is not available.");

    return new Promise((resolve, reject) => {
      const args = [
        'run', '--rm', '-i',
        options.memoryLimit ? `--memory=${options.memoryLimit}m` : '',
        options.cpuLimit ? `--cpus=${options.cpuLimit}` : '',
        options.networkAccess === false ? '--network=none' : '',
        options.image || 'alpine:latest',
        ...command
      ].filter(Boolean);

      const proc = spawn('docker', args);
      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`Sandbox timeout after ${options.timeout}ms`));
      }, options.timeout || 60000);

      proc.stdout.on('data', (data) => stdout += data.toString());
      proc.stderr.on('data', (data) => stderr += data.toString());

      if (input) {
        proc.stdin.write(input);
        proc.stdin.end();
      }

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code || 0 });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private async runWasm(command: string[], options: SandboxOptions, input?: string): Promise<{ stdout: string, stderr: string, exitCode: number }> {
    console.log(`[Sandbox] Running WASM: ${command[0]}`);
    // Implementation for WASM execution (e.g. via wasmer-js or shell call to wasmtime)
    // For now, simulating a shell call to wasmtime
    return this.runLocalProcess(['wasmtime', ...command], options, input);
  }

  private async runLocalProcess(command: string[], options: SandboxOptions, input?: string): Promise<{ stdout: string, stderr: string, exitCode: number }> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command;
      const proc = spawn(cmd, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => stdout += data.toString());
      proc.stderr.on('data', (data) => stderr += data.toString());

      if (input) {
        proc.stdin.write(input);
        proc.stdin.end();
      }

      proc.on('close', (code) => resolve({ stdout, stderr, exitCode: code || 0 }));
      proc.on('error', (err) => reject(err));
    });
  }
}
