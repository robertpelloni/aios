import systeminformation from 'systeminformation';

export class HardwareManager {
  private static instance: HardwareManager;
  private isMining: boolean = false;

  private constructor() {}

  public static getInstance(): HardwareManager {
    if (!HardwareManager.instance) {
      HardwareManager.instance = new HardwareManager();
    }
    return HardwareManager.instance;
  }

  public async getSystemSpecs(): Promise<any> {
    const cpu = await systeminformation.cpu();
    const mem = await systeminformation.mem();
    const graphics = await systeminformation.graphics();
    
    return {
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
      },
      memory: {
        total: mem.total,
        free: mem.free,
      },
      gpu: graphics.controllers.map(g => ({
        model: g.model,
        vram: g.vram,
      }))
    };
  }

  public async getResourceUsage(): Promise<any> {
    const load = await systeminformation.currentLoad();
    const mem = await systeminformation.mem();
    
    return {
      cpuLoad: load.currentLoad,
      memoryUsed: mem.active,
      memoryTotal: mem.total
    };
  }

  public async calculateHashratePotential(): Promise<number> {
    const specs = await this.getSystemSpecs();
    let score = 0;
    
    score += specs.cpu.cores * 100;
    
    if (specs.gpu.length > 0) {
      score += 1000 * specs.gpu.length;
    }

    return score;
  }

  public startMining(): void {
    if (this.isMining) return;
    this.isMining = true;
    console.log('Hardware mining started...');
  }

  public stopMining(): void {
    if (!this.isMining) return;
    this.isMining = false;
    console.log('Hardware mining stopped.');
  }

  public getMiningStatus(): boolean {
    return this.isMining;
  }
}
