import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GpuStatus {
  hasGpu: boolean;
  type?: 'nvidia' | 'apple' | 'amd';
  vramTotal?: number;
  vramUsed?: number;
  activeModels: string[];
}

export class GpuAccelerationService extends EventEmitter {
  private static instance: GpuAccelerationService;
  private status: GpuStatus = { hasGpu: false, activeModels: [] };

  private constructor() {
    super();
    this.detectGpu();
  }

  static getInstance(): GpuAccelerationService {
    if (!GpuAccelerationService.instance) {
      GpuAccelerationService.instance = new GpuAccelerationService();
    }
    return GpuAccelerationService.instance;
  }

  private async detectGpu() {
    try {
      // Simple detection for NVIDIA via nvidia-smi
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('nvidia-smi --query-gpu=memory.total,memory.used --format=csv,noheader,nounits');
        const [total, used] = stdout.split(',').map(s => parseInt(s.trim()));
        this.status = {
          hasGpu: true,
          type: 'nvidia',
          vramTotal: total,
          vramUsed: used,
          activeModels: []
        };
      } else if (process.platform === 'darwin') {
        // Simple detection for Apple Silicon
        this.status = {
          hasGpu: true, // Assuming M1/M2/M3
          type: 'apple',
          activeModels: []
        };
      }
    } catch {
      this.status = { hasGpu: false, activeModels: [] };
    }
    this.emit('statusUpdated', this.status);
  }

  getStatus(): GpuStatus {
    return this.status;
  }

  async loadLocalModel(modelPath: string) {
    if (!this.status.hasGpu) {
      console.warn('[GpuService] No GPU detected, loading on CPU...');
    }
    console.log(`[GpuService] Loading model: ${modelPath}`);
    // Integration logic for llama.cpp or similar would go here
    this.status.activeModels.push(modelPath);
    this.emit('modelLoaded', modelPath);
    return true;
  }
}
