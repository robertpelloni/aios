import { EventEmitter } from 'events';
import crypto from 'crypto';
import { A2AManager } from './A2AManager.js';

export interface CouncilNode {
  id: string;
  name: string;
  url: string;
  token?: string;
  status: 'online' | 'offline' | 'unknown';
  lastSeen?: number;
  metadata?: Record<string, any>;
}

export class CouncilNodeManager extends EventEmitter {
  private static instance: CouncilNodeManager | null = null;
  private nodes: Map<string, CouncilNode> = new Map();
  private a2a: A2AManager;

  private constructor() {
    super();
    this.a2a = A2AManager.getInstance();
  }

  static getInstance(): CouncilNodeManager {
    if (!CouncilNodeManager.instance) {
      CouncilNodeManager.instance = new CouncilNodeManager();
    }
    return CouncilNodeManager.instance;
  }

  addNode(node: Omit<CouncilNode, 'id' | 'status'>): CouncilNode {
    const id = crypto.randomUUID();
    const newNode: CouncilNode = {
      ...node,
      id,
      status: 'unknown',
    };
    this.nodes.set(id, newNode);
    this.emit('nodeAdded', newNode);
    return newNode;
  }

  updateNode(id: string, updates: Partial<Omit<CouncilNode, 'id'>>): CouncilNode | null {
    const node = this.nodes.get(id);
    if (!node) return null;

    const updatedNode = { ...node, ...updates };
    this.nodes.set(id, updatedNode);
    this.emit('nodeUpdated', updatedNode);
    return updatedNode;
  }

  removeNode(id: string): boolean {
    const deleted = this.nodes.delete(id);
    if (deleted) {
      this.emit('nodeRemoved', id);
    }
    return deleted;
  }

  getNode(id: string): CouncilNode | null {
    return this.nodes.get(id) ?? null;
  }

  getAllNodes(): CouncilNode[] {
    return Array.from(this.nodes.values());
  }

  async pingNode(id: string): Promise<boolean> {
    const node = this.nodes.get(id);
    if (!node) return false;

    try {
      const response = await fetch(`${node.url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const status = response.ok ? 'online' : 'offline';
      this.updateNode(id, { status, lastSeen: Date.now() });
      return response.ok;
    } catch {
      this.updateNode(id, { status: 'offline' });
      return false;
    }
  }

  async discoverRemoteSupervisors(nodeId: string): Promise<any[]> {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    try {
      const headers: Record<string, string> = {};
      if (node.token) {
        headers['Authorization'] = `Bearer ${node.token}`;
      }

      const response = await fetch(`${node.url}/api/council/supervisors`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.supervisors || [];
    } catch (error) {
      console.error(`[CouncilNodeManager] Discovery failed for node ${node.name}:`, error);
      return [];
    }
  }

  async discoverRemoteAgents(nodeId: string): Promise<any[]> {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    try {
      // Use the A2A well-known discovery
      const card = await this.a2a.discoverAgent(node.url);
      if (card) {
        return [card];
      }
      return [];
    } catch (error) {
      console.error(`[CouncilNodeManager] A2A discovery failed for node ${node.name}:`, error);
      return [];
    }
  }
}
