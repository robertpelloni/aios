import fs from 'fs';
import path from 'path';
import os from 'os';
import json5 from 'json5';
import { spawn, execSync, ChildProcess } from 'child_process';
import { ShellManager } from './ShellManager.js';

interface ClientConfig {
  name: string;
  configPath: string;
  exists: boolean;
  type: 'json' | 'toml' | 'env';
}

interface CLIAdapter {
  name: string;
  command: string;
  available: boolean;
  version?: string;
}

interface RunningCLI {
  name: string;
  process: ChildProcess;
  startedAt: Date;
}

export class ClientManager {
  private clients: ClientConfig[] = [];
  private mcpenetesBin: string;
  private shellManager: ShellManager;
  private cliAdapters: Map<string, CLIAdapter> = new Map();
  private runningCLIs: Map<string, RunningCLI> = new Map();

  constructor(extraPaths?: { name: string, paths: string[] }[]) {
    this.shellManager = new ShellManager();
    this.detectClients(extraPaths);
    this.detectCLIAdapters();

    this.mcpenetesBin = path.resolve(process.cwd(), 'submodules/mcpenetes/mcpenetes-bin');
  }

  private detectCLIAdapters() {
    const cliTools = [
      { name: 'claude', command: 'claude' },
      { name: 'gemini', command: 'gemini' },
      { name: 'opencode', command: 'opencode' },
      { name: 'aider', command: 'aider' },
      { name: 'cursor', command: 'cursor' }
    ];

    for (const cli of cliTools) {
      try {
        const versionCmd = cli.name === 'aider' ? '--version' : '--version';
        const result = execSync(`${cli.command} ${versionCmd} 2>&1`, { 
          timeout: 5000, 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        this.cliAdapters.set(cli.name, {
          name: cli.name,
          command: cli.command,
          available: true,
          version: result.trim().split('\n')[0]
        });
      } catch {
        this.cliAdapters.set(cli.name, {
          name: cli.name,
          command: cli.command,
          available: false
        });
      }
    }
  }

  getCLIAdapters(): CLIAdapter[] {
    return Array.from(this.cliAdapters.values());
  }

  async spawnCLI(cliName: string, args: string[] = [], cwd?: string): Promise<{ pid: number; name: string }> {
    const adapter = this.cliAdapters.get(cliName);
    if (!adapter) throw new Error(`CLI '${cliName}' not found`);
    if (!adapter.available) throw new Error(`CLI '${cliName}' is not installed`);

    if (this.runningCLIs.has(cliName)) {
      throw new Error(`CLI '${cliName}' is already running (PID: ${this.runningCLIs.get(cliName)!.process.pid})`);
    }

    const proc = spawn(adapter.command, args, {
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    this.runningCLIs.set(cliName, {
      name: cliName,
      process: proc,
      startedAt: new Date()
    });

    proc.on('exit', () => {
      this.runningCLIs.delete(cliName);
    });

    return { pid: proc.pid!, name: cliName };
  }

  async sendToCLI(cliName: string, input: string): Promise<string> {
    const running = this.runningCLIs.get(cliName);
    if (!running) throw new Error(`CLI '${cliName}' is not running`);

    return new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => {
        resolve(output || 'No response within timeout');
      }, 30000);

      running.process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      running.process.stderr?.on('data', (data) => {
        output += data.toString();
      });

      running.process.stdin?.write(input + '\n', (err) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }

  stopCLI(cliName: string): boolean {
    const running = this.runningCLIs.get(cliName);
    if (!running) return false;

    running.process.kill('SIGTERM');
    this.runningCLIs.delete(cliName);
    return true;
  }

  getRunningCLIs(): Array<{ name: string; pid: number; startedAt: Date }> {
    return Array.from(this.runningCLIs.values()).map(r => ({
      name: r.name,
      pid: r.process.pid!,
      startedAt: r.startedAt
    }));
  }

  private detectClients(extraPaths?: { name: string, paths: string[] }[]) {
    const homeDir = os.homedir();
    const platform = os.platform();

    // Define potential paths for known clients
    const potentialPaths = [
      {
        name: 'VSCode',
        type: 'json',
        paths: [
          platform === 'win32'
            ? path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'mcp-servers.json')
            : path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'mcp-servers.json'),
           // linux path?
           path.join(homeDir, '.config', 'Code', 'User', 'globalStorage', 'mcp-servers.json')
        ]
      },
      {
        name: 'Claude Desktop',
        type: 'json',
        paths: [
           platform === 'win32'
            ? path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
            : path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
        ]
      },
       {
        name: 'Cursor',
        type: 'json',
        paths: [
           platform === 'win32'
            ? path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'mcp-servers.json')
            : path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'mcp-servers.json')
        ]
      },
      {
        name: 'Claude Code',
        type: 'json',
        paths: [
            path.join(homeDir, '.claude', 'config.json') // Hypothetical path for now
        ]
      }
    ];

    if (extraPaths) {
        // @ts-ignore
        potentialPaths.push(...extraPaths);
    }

    this.clients = [];

    for (const p of potentialPaths) {
      for (const tryPath of p.paths) {
        if (fs.existsSync(tryPath)) {
            this.clients.push({ name: p.name, configPath: tryPath, exists: true, type: p.type as any });
            break;
        } else if (p.paths.indexOf(tryPath) === p.paths.length - 1) {
             this.clients.push({ name: p.name, configPath: p.paths[0], exists: false, type: p.type as any });
        }
      }
    }
  }

  getClients() {
    return this.clients.map(c => ({
        ...c,
        exists: fs.existsSync(c.configPath)
    }));
  }

  async installCLI() {
      const binPath = path.resolve(process.cwd(), 'bin', 'aios');
      const aliasCommand = `alias aios="${binPath}"`;
      await this.shellManager.addToProfile('aios CLI', aliasCommand);
      return { status: 'installed', binPath };
  }

  async configureClient(clientName: string, hubConfig: any) {
    const client = this.clients.find(c => c.name === clientName);
    if (!client) throw new Error(`Client ${clientName} not found`);

    // Strategy 1: Try mcpenetes binary (if available and executable)
    if (fs.existsSync(this.mcpenetesBin)) {
        try {
            console.log(`[ClientManager] Using mcpenetes binary at ${this.mcpenetesBin}`);
            const result = execSync(
              `${this.mcpenetesBin} install aios-hub node ${hubConfig.scriptPath}`,
              { encoding: 'utf-8', timeout: 10000 }
            );
            console.log(`[ClientManager] mcpenetes result: ${result}`);
            return { status: 'configured_via_mcpenetes', path: client.configPath };
        } catch (e) {
            console.warn("[ClientManager] mcpenetes failed, falling back to TS implementation", e);
        }
    }

    // Strategy 2: Native TS Implementation
    if (client.type === 'json') {
        let currentConfig: any = { mcpServers: {} };

        if (fs.existsSync(client.configPath)) {
            try {
                const content = fs.readFileSync(client.configPath, 'utf-8');
                currentConfig = json5.parse(content);
            } catch (err) {
                console.error(`Failed to parse config for ${clientName}, starting fresh.`, err);
                fs.copyFileSync(client.configPath, client.configPath + '.bak');
            }
        }

        if (!currentConfig.mcpServers) currentConfig.mcpServers = {};

        currentConfig.mcpServers["aios-hub"] = {
            command: "node",
            args: [hubConfig.scriptPath],
            env: {
                ...hubConfig.env,
                MCP_STDIO_ENABLED: 'true'
            }
        };

        fs.mkdirSync(path.dirname(client.configPath), { recursive: true });
        fs.writeFileSync(client.configPath, JSON.stringify(currentConfig, null, 2));

        return { status: 'configured', path: client.configPath };
    }

    return { status: 'unsupported_type', type: client.type };
  }
}
