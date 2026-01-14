import { EventEmitter } from 'events';
import { DatabaseManager } from '../db/index.js';

export interface MemoryEntry {
  id: string;
  content: string;
  type: 'short_term' | 'long_term' | 'archival';
  tags: string[];
  metadata: Record<string, any>;
  createdAt: number;
}

export interface MemoryPlugin {
  name: string;
  store: (entry: MemoryEntry) => Promise<string>;
  retrieve: (query: string, type?: string) => Promise<MemoryEntry[]>;
}

export class MemoryPluginManager extends EventEmitter {
  private static instance: MemoryPluginManager;
  private plugins: Map<string, MemoryPlugin> = new Map();
  private db: DatabaseManager;

  private constructor(dataDir: string) {
    super();
    this.db = DatabaseManager.getInstance(dataDir);
  }

  static getInstance(dataDir?: string): MemoryPluginManager {
    if (!MemoryPluginManager.instance) {
      if (!dataDir) throw new Error("MemoryPluginManager requires dataDir");
      MemoryPluginManager.instance = new MemoryPluginManager(dataDir);
    }
    return MemoryPluginManager.instance;
  }

  registerPlugin(plugin: MemoryPlugin) {
    this.plugins.set(plugin.name, plugin);
    this.emit('plugin:registered', plugin.name);
  }

  async store(content: string, type: 'short_term' | 'long_term' = 'short_term', tags: string[] = []) {
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      content,
      type,
      tags,
      metadata: {},
      createdAt: Date.now()
    };

    for (const plugin of this.plugins.values()) {
      try {
        await plugin.store(entry);
      } catch (e) {
        console.error(`[MemoryPlugin] Failed to store in ${plugin.name}:`, e);
      }
    }

    return entry.id;
  }

  async retrieve(query: string) {
    const results = [];
    for (const plugin of this.plugins.values()) {
      try {
        const hits = await plugin.retrieve(query);
        results.push(...hits);
      } catch (e) {
        console.error(`[MemoryPlugin] Failed to retrieve from ${plugin.name}:`, e);
      }
    }
    return results;
  }
}
