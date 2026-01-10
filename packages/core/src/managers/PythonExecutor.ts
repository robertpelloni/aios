import { spawn, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface PythonExecutorOptions {
  useDocker?: boolean;
  dockerImage?: string;
  timeout?: number;
  allowLocalFallback?: boolean;
}

export class PythonExecutor {
  private dockerAvailable: boolean | null = null;
  private defaultOptions: PythonExecutorOptions = {
    useDocker: true,
    dockerImage: 'python:3.11-slim',
    timeout: 60000,
    allowLocalFallback: true
  };

  constructor(options?: Partial<PythonExecutorOptions>) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  private checkDockerAvailable(): boolean {
    if (this.dockerAvailable !== null) return this.dockerAvailable;
    
    try {
      execSync('docker --version', { stdio: 'pipe' });
      execSync('docker info', { stdio: 'pipe', timeout: 5000 });
      this.dockerAvailable = true;
    } catch {
      this.dockerAvailable = false;
    }
    return this.dockerAvailable;
  }

  private async executeInDocker(
    scriptPath: string, 
    args: string[], 
    cwd: string,
    options: PythonExecutorOptions
  ): Promise<string> {
    const scriptDir = path.dirname(scriptPath);
    const scriptName = path.basename(scriptPath);
    const dockerImage = options.dockerImage || this.defaultOptions.dockerImage;
    
    const dockerArgs = [
      'run', '--rm',
      '--network', 'none',
      '-v', `${scriptDir}:/app:ro`,
      '-w', '/app',
      '--memory', '512m',
      '--cpus', '1',
      dockerImage!,
      'python', scriptName, ...args
    ];

    return new Promise((resolve, reject) => {
      const timeout = options.timeout || this.defaultOptions.timeout;
      let timedOut = false;

      const dockerProcess = spawn('docker', dockerArgs, { cwd });
      
      const timer = setTimeout(() => {
        timedOut = true;
        dockerProcess.kill('SIGKILL');
        reject(new Error(`Docker execution timed out after ${timeout}ms`));
      }, timeout);

      let output = '';
      let errorOutput = '';

      dockerProcess.stdout.on('data', (data) => { output += data.toString(); });
      dockerProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

      dockerProcess.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) return;
        
        if (code !== 0) {
          reject(new Error(`Docker Python execution failed (code ${code}): ${errorOutput}`));
        } else {
          resolve(output);
        }
      });

      dockerProcess.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private async executeLocal(
    scriptPath: string, 
    args: string[], 
    cwd: string,
    options: PythonExecutorOptions
  ): Promise<string> {
    console.warn(`[PythonExecutor] WARNING: Executing Python script on host (no sandbox): ${scriptPath}`);
    
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || this.defaultOptions.timeout;
      let timedOut = false;

      const pythonProcess = spawn('python', [scriptPath, ...args], {
        cwd,
        env: process.env,
        shell: true
      });

      const timer = setTimeout(() => {
        timedOut = true;
        pythonProcess.kill('SIGKILL');
        reject(new Error(`Local Python execution timed out after ${timeout}ms`));
      }, timeout);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
      pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

      pythonProcess.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) return;
        
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}\nErrors: ${errorOutput}`));
        } else {
          resolve(output);
        }
      });
      
      pythonProcess.on('error', reject);
    });
  }

  async executeScript(
    scriptPath: string, 
    args: string[] = [], 
    cwd?: string,
    options?: Partial<PythonExecutorOptions>
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    const normalizedPath = path.normalize(scriptPath);
    const workingDir = cwd || path.dirname(normalizedPath);

    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Script not found: ${normalizedPath}`);
    }

    const useDocker = opts.useDocker && this.checkDockerAvailable();

    if (useDocker) {
      console.log(`[PythonExecutor] Executing in Docker container: ${path.basename(scriptPath)}`);
      return this.executeInDocker(normalizedPath, args, workingDir, opts);
    }

    if (!opts.allowLocalFallback) {
      throw new Error('Docker not available and local execution is disabled');
    }

    return this.executeLocal(normalizedPath, args, workingDir, opts);
  }

  isDockerAvailable(): boolean {
    return this.checkDockerAvailable();
  }
}
