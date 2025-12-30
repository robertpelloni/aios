import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { AgentDefinition } from '../types.js';
import { AgentRegistry } from './AgentRegistry.js';
import { AgentProfile } from '../interfaces/AgentInterfaces.js';
import { AgentAdapter } from '../adapters/AgentAdapter.js';
import { OpenCodeAdapter } from '../adapters/OpenCodeAdapter.js';

export class AgentManager extends EventEmitter {
  private agents: Map<string, AgentDefinition> = new Map();
  private watcher: chokidar.FSWatcher | null = null;
  public registry: AgentRegistry;
  private adapters: Map<string, AgentAdapter> = new Map();
  
  constructor(private rootDir: string) {
    super();
    this.registry = new AgentRegistry();
    
    // Register Default Adapters
    this.registerAdapter('opencode', new OpenCodeAdapter());
  }

  registerAdapter(name: string, adapter: AgentAdapter) {
      this.adapters.set(name, adapter);
  }

  async start() {
    // Watch agents/ directory and external agents
    // rootDir is usually .../packages/core/src or .../packages/core/dist
    // We need to go up 3 levels to reach the workspace root if we are in src/dist
    // root -> packages -> core -> src
    
    const workspaceRoot = path.resolve(this.rootDir, '../../../');
    const externalAgentsPath = path.join(workspaceRoot, 'external/agents_repos/open-agents/.opencode/agent');

    // We need to match deeper than just the immediate folder for external agents
    // Chokidar is recursive by default, but the ignore pattern might be catching .opencode
    // ignored: /(^|[\/\\])\../ means "ignore anything starting with dot"
    // .opencode starts with dot, so it is ignored. We must un-ignore it.

    this.watcher = chokidar.watch([
        path.join(this.rootDir, 'agents'),
        path.join(this.rootDir, 'AGENTS.md'),
        externalAgentsPath
    ], {
      ignored: (path: string, stats?: any) => {
          // Allow .opencode folder
          if (path.includes('.opencode')) return false;
          // Ignore other dotfiles/folders
          return /(^|[\/\\])\../.test(path);
      },
      persistent: true
    });

    this.watcher.on('add', this.handleFileChange.bind(this));
    this.watcher.on('change', this.handleFileChange.bind(this));
    this.watcher.on('unlink', this.handleFileRemove.bind(this));
    
    console.log(`[AgentManager] Watching agents/, AGENTS.md, and external open-agents`);
  }

  private async handleFileChange(filepath: string) {
      const filename = path.basename(filepath);

      try {
        if (filename === 'AGENTS.md') {
            await this.loadAgentsFromMarkdown(filepath);
        } else if (filename.endsWith('.json')) {
            await this.loadAgentFromJson(filepath);
        } else if (filepath.includes('.opencode') && (filename.endsWith('.md') || filename.endsWith('.markdown'))) {
             // Handle OpenCode agents
             await this.loadAgentWithAdapter(filepath, 'opencode');
        }
      } catch (err) {
          console.error(`[AgentManager] Error handling file change for ${filepath}:`, err);
      }
  }

  private async loadAgentWithAdapter(filepath: string, adapterName: string) {
      const adapter = this.adapters.get(adapterName);
      if (!adapter) {
          console.warn(`[AgentManager] No adapter found for ${adapterName}`);
          return;
      }

      try {
          const content = await fs.readFile(filepath, 'utf-8');
          const agentDef = await adapter.parse(filepath, content);
          
          if (agentDef) {
              const id = `opencode-${path.basename(filepath, path.extname(filepath))}`;
              this.agents.set(id, agentDef);
              this.registerAgentToRegistry(id, agentDef);
              console.log(`[AgentManager] Loaded agent via ${adapterName}: ${agentDef.name}`);
              this.emit('updated', this.getAgents());
          }
      } catch (err) {
          console.error(`[AgentManager] Error loading agent with adapter ${adapterName} for ${filepath}:`, err);
      }
  }

  private handleFileRemove(filepath: string) {
      const filename = path.basename(filepath);
      if (filename === 'AGENTS.md') {
          // Remove all agents that came from AGENTS.md?
          // For simplicity, we just reload what's left or do nothing until restart.
          // Ideally we track source of agent.
      } else {
          this.agents.delete(filename);
          this.registry.unregister(filename);
          this.emit('updated', this.getAgents());
      }
  }

  private async loadAgentFromJson(filepath: string) {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const filename = path.basename(filepath);
      const agent: AgentDefinition = JSON.parse(content);
      this.agents.set(filename, agent);
      
      // Register to AgentRegistry
      this.registerAgentToRegistry(filename, agent);

      console.log(`[AgentManager] Loaded agent: ${agent.name}`);
      this.emit('updated', this.getAgents());
    } catch (err) {
      console.error(`[AgentManager] Error loading agent ${filepath}:`, err);
    }
  }

  private registerAgentToRegistry(id: string, def: AgentDefinition) {
      const profile: AgentProfile = {
          id: id,
          name: def.name,
          description: def.description,
          capabilities: def.tools || [],
          metadata: {
              model: def.model,
              instructions: def.instructions,
              source: 'file'
          }
      };
      this.registry.register(profile);
  }

  private async loadAgentsFromMarkdown(filepath: string) {
      try {
          const content = await fs.readFile(filepath, 'utf-8');
          // Parse Markdown
          // Strategy: Look for headers like "## Agent: Name"
          // And code blocks for JSON config? Or description text?
          // Let's assume a simple format:
          // ## AgentName
          // Description...
          // ```json
          // { "instructions": "..." }
          // ```

          const lines = content.split('\n');
          let currentAgent: Partial<AgentDefinition> | null = null;

          for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.startsWith('## ')) {
                  if (currentAgent && currentAgent.name) {
                      const id = `markdown-${currentAgent.name}`;
                      this.agents.set(id, currentAgent as AgentDefinition);
                      this.registerAgentToRegistry(id, currentAgent as AgentDefinition);
                  }
                  currentAgent = {
                      name: line.replace('## ', '').trim(),
                      description: '',
                      instructions: ''
                  };
              } else if (currentAgent) {
                  if (line.trim().startsWith('```json')) {
                      // Read until end of block
                      let jsonBlock = '';
                      i++;
                      while (i < lines.length && !lines[i].trim().startsWith('```')) {
                          jsonBlock += lines[i] + '\n';
                          i++;
                      }
                      try {
                          const config = JSON.parse(jsonBlock);
                          Object.assign(currentAgent, config);
                      } catch (e) {}
                  } else {
                      if (!currentAgent.description) currentAgent.description = line;
                      else currentAgent.instructions += line + '\n';
                  }
              }
          }
          if (currentAgent && currentAgent.name) {
              const id = `markdown-${currentAgent.name}`;
              this.agents.set(id, currentAgent as AgentDefinition);
              this.registerAgentToRegistry(id, currentAgent as AgentDefinition);
          }

          console.log(`[AgentManager] Reloaded AGENTS.md`);
          this.emit('updated', this.getAgents());

      } catch (err) {
          console.error(`[AgentManager] Error parsing AGENTS.md:`, err);
      }
  }

  getAgents() {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
        ...agent,
        id
    }));
  }
}
