import { EventEmitter } from 'events';
import { ClientManager } from '../managers/ClientManager.js';

export interface CliPlugin {
  name: string;
  description: string;
  match: (command: string) => boolean;
  execute: (command: string, args: string[], context: any) => Promise<any>;
}

export class CliPluginManager extends EventEmitter {
  private static instance: CliPluginManager;
  private plugins: Map<string, CliPlugin> = new Map();
  private clientManager: ClientManager;

  private constructor() {
    super();
    this.clientManager = new ClientManager();
    this.registerDefaultPlugins();
  }

  static getInstance(): CliPluginManager {
    if (!CliPluginManager.instance) {
      CliPluginManager.instance = new CliPluginManager();
    }
    return CliPluginManager.instance;
  }

  registerPlugin(plugin: CliPlugin) {
    this.plugins.set(plugin.name, plugin);
    this.emit('plugin:registered', plugin.name);
  }

  private registerDefaultPlugins() {
    this.registerPlugin({
      name: 'claude-code',
      description: 'Wraps Claude Code CLI',
      match: (cmd) => cmd === 'claude',
      execute: async (cmd, args, ctx) => {
        console.log('[CliPlugin] Wrapping Claude Code execution...');
        return this.clientManager.spawnCLI('claude', args, ctx.cwd);
      }
    });

    this.registerPlugin({
      name: 'aider',
      description: 'Wraps Aider CLI',
      match: (cmd) => cmd === 'aider',
      execute: async (cmd, args, ctx) => {
        console.log('[CliPlugin] Wrapping Aider execution...');
        return this.clientManager.spawnCLI('aider', args, ctx.cwd);
      }
    });
  }

  async executeCommand(command: string, args: string[], context: any = {}) {
    for (const plugin of this.plugins.values()) {
      if (plugin.match(command)) {
        return plugin.execute(command, args, context);
      }
    }
    throw new Error(`No plugin found for command: ${command}`);
  }
}
