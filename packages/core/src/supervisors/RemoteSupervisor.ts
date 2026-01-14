import { BaseSupervisor, type CouncilMessage, type SupervisorConfig, fetchWithRetry } from './BaseSupervisor.js';

export interface RemoteSupervisorConfig extends SupervisorConfig {
  remoteUrl: string;
  remoteToken?: string;
  remoteSupervisorName: string;
}

export class RemoteSupervisor extends BaseSupervisor {
  private remoteUrl: string;
  private remoteToken?: string;
  private remoteSupervisorName: string;

  constructor(config: RemoteSupervisorConfig) {
    super(config);
    this.remoteUrl = config.remoteUrl;
    this.remoteToken = config.remoteToken;
    this.remoteSupervisorName = config.remoteSupervisorName;
  }

  protected getDefaultModel(): string {
    return 'remote-model';
  }

  protected getDefaultBaseURL(): string {
    return this.remoteUrl;
  }

  async chat(messages: CouncilMessage[]): Promise<string> {
    const url = `${this.remoteUrl}/api/council/supervisors/${this.remoteSupervisorName}/chat`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.remoteToken) {
      headers['Authorization'] = `Bearer ${this.remoteToken}`;
    }

    try {
      const response = await fetchWithRetry(this.name, url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, temperature: this.temperature }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Remote supervisor failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error(`[RemoteSupervisor:${this.name}] Chat failed:`, error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    const url = `${this.remoteUrl}/health`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch {
      return false;
    }
  }
}
