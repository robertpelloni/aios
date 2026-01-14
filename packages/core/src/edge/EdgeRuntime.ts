import { EventEmitter } from 'events';
import { McpProxyManager } from '../managers/McpProxyManager.js';
import { AgentExecutor } from '../agents/AgentExecutor.js';

export interface EdgeConfig {
  hubUrl: string;
  nodeName: string;
  authToken?: string;
  capabilities: string[];
}

export class EdgeRuntime extends EventEmitter {
  private connected: boolean = false;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(
    private config: EdgeConfig,
    private proxyManager: McpProxyManager,
    private agentExecutor: AgentExecutor
  ) {
    super();
  }

  async start() {
    console.log(`[EdgeRuntime] Starting edge node: ${this.config.nodeName}`);
    await this.connectToHub();
  }

  private async connectToHub() {
    try {
      const response = await fetch(`${this.config.hubUrl}/api/council-nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.config.authToken ? `Bearer ${this.config.authToken}` : ''
        },
        body: JSON.stringify({
          name: this.config.nodeName,
          url: process.env.EDGE_EXTERNAL_URL || 'http://localhost:3000',
          metadata: {
            isEdge: true,
            capabilities: this.config.capabilities,
            platform: process.platform,
            arch: process.arch
          }
        })
      });

      if (response.ok) {
        this.connected = true;
        console.log(`[EdgeRuntime] Successfully registered with Hub at ${this.config.hubUrl}`);
        this.emit('connected');
      } else {
        throw new Error(`Hub returned ${response.status}`);
      }
    } catch (err: any) {
      console.error(`[EdgeRuntime] Failed to connect to Hub: ${err.message}. Retrying in 30s...`);
      this.scheduleRetry();
    }
  }

  private scheduleRetry() {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connectToHub();
    }, 30000);
  }

  async stop() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.connected = false;
  }

  getStatus() {
    return {
      connected: this.connected,
      nodeName: this.config.nodeName,
      hubUrl: this.config.hubUrl
    };
  }
}
