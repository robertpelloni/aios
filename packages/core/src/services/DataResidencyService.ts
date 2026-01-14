import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

export type StorageProvider = 'local' | 's3' | 'azure-blob' | 'mongodb' | 'ipfs';

export interface DataResidencyPolicy {
  dataType: string; // 'logs' | 'memories' | 'sessions' | 'files'
  provider: StorageProvider;
  region?: string;
  encryption?: boolean;
  retentionDays?: number;
}

export class DataResidencyService extends EventEmitter {
  private static instance: DataResidencyService | null = null;
  private policies: Map<string, DataResidencyPolicy> = new Map();
  private configPath: string;

  private constructor(dataDir: string) {
    super();
    this.configPath = path.join(dataDir, 'data_residency.json');
    this.loadPolicies();
  }

  static getInstance(dataDir?: string): DataResidencyService {
    if (!DataResidencyService.instance) {
      if (!dataDir) throw new Error("DataResidencyService requires dataDir for initialization");
      DataResidencyService.instance = new DataResidencyService(dataDir);
    }
    return DataResidencyService.instance;
  }

  private loadPolicies() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        for (const policy of data) {
          this.policies.set(policy.dataType, policy);
        }
      } else {
        // Default policies
        const defaults: DataResidencyPolicy[] = [
          { dataType: 'logs', provider: 'local', retentionDays: 30 },
          { dataType: 'memories', provider: 'local', encryption: true },
          { dataType: 'sessions', provider: 'local' },
          { dataType: 'files', provider: 'local' }
        ];
        defaults.forEach(p => this.policies.set(p.dataType, p));
        this.savePolicies();
      }
    } catch (e) {
      console.error('[DataResidencyService] Failed to load policies:', e);
    }
  }

  private savePolicies() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(Array.from(this.policies.values()), null, 2));
    } catch (e) {
      console.error('[DataResidencyService] Failed to save policies:', e);
    }
  }

  getPolicies(): DataResidencyPolicy[] {
    return Array.from(this.policies.values());
  }

  updatePolicy(dataType: string, updates: Partial<DataResidencyPolicy>) {
    const policy = this.policies.get(dataType);
    if (!policy) throw new Error(`Policy for ${dataType} not found`);

    const updated = { ...policy, ...updates };
    this.policies.set(dataType, updated);
    this.savePolicies();
    this.emit('policyUpdated', updated);
    return updated;
  }

  getStorageConfig(dataType: string): DataResidencyPolicy {
    return this.policies.get(dataType) || { dataType, provider: 'local' };
  }
}
