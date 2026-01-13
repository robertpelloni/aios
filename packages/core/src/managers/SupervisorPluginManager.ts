import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface SupervisorPluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  main: string;
  specialties?: string[];
  config?: Record<string, unknown>;
}

export interface SupervisorPluginInstance {
  name: string;
  chat(messages: Array<{ role: string; content: string }>): Promise<string>;
  isAvailable(): Promise<boolean>;
  getSpecialties?(): string[];
  dispose?(): Promise<void>;
}

export interface LoadedPlugin {
  id: string;
  manifest: SupervisorPluginManifest;
  instance: SupervisorPluginInstance;
  path: string;
  loadedAt: Date;
  status: 'active' | 'error' | 'disabled';
  error?: string;
}

export interface PluginManagerConfig {
  pluginsDir?: string;
  autoLoad?: boolean;
}

export class SupervisorPluginManager extends EventEmitter {
  private static instance: SupervisorPluginManager | null = null;
  private plugins: Map<string, LoadedPlugin> = new Map();
  private config: Required<PluginManagerConfig>;

  private constructor(config: PluginManagerConfig = {}) {
    super();
    this.config = {
      pluginsDir: config.pluginsDir ?? './plugins/supervisors',
      autoLoad: config.autoLoad ?? false,
    };
  }

  static getInstance(config?: PluginManagerConfig): SupervisorPluginManager {
    if (!SupervisorPluginManager.instance) {
      SupervisorPluginManager.instance = new SupervisorPluginManager(config);
    }
    return SupervisorPluginManager.instance;
  }

  static resetInstance(): void {
    SupervisorPluginManager.instance = null;
  }

  registerInlinePlugin(
    name: string,
    chatFn: (messages: Array<{ role: string; content: string }>) => Promise<string>,
    options?: { specialties?: string[] }
  ): string {
    const pluginId = `inline:${name}-${crypto.randomBytes(4).toString('hex')}`;
    const instance: SupervisorPluginInstance = {
      name,
      chat: chatFn,
      isAvailable: async () => true,
      getSpecialties: () => options?.specialties || [],
    };

    const loadedPlugin: LoadedPlugin = {
      id: pluginId,
      manifest: { name, version: '1.0.0', main: 'inline', specialties: options?.specialties },
      instance,
      path: 'inline',
      loadedAt: new Date(),
      status: 'active',
    };

    this.plugins.set(pluginId, loadedPlugin);
    return pluginId;
  }

  async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    if (plugin.instance.dispose) await plugin.instance.dispose();
    this.plugins.delete(pluginId);
    return true;
  }

  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) plugin.status = 'disabled';
  }

  enablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) plugin.status = 'active';
  }

  getPlugin(id: string): LoadedPlugin | undefined {
    return this.plugins.get(id);
  }

  getPluginInstance(id: string): SupervisorPluginInstance | undefined {
    return this.plugins.get(id)?.instance;
  }

  listPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.status === 'active');
  }

  getPluginsBySpecialty(specialty: string): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(p => 
      p.status === 'active' && p.manifest.specialties?.includes(specialty)
    );
  }

  async checkPluginHealth(id: string): Promise<{ available: boolean; error?: string }> {
    const plugin = this.plugins.get(id);
    if (!plugin) return { available: false, error: 'Not found' };
    try {
      const available = await plugin.instance.isAvailable();
      return { available };
    } catch (e) {
      return { available: false, error: (e as Error).message };
    }
  }

  getStats(): { total: number; active: number } {
    const all = Array.from(this.plugins.values());
    return {
      total: all.length,
      active: all.filter(p => p.status === 'active').length,
    };
  }

  async disposeAll(): Promise<void> {
    for (const id of this.plugins.keys()) {
      await this.unloadPlugin(id);
    }
  }
}
