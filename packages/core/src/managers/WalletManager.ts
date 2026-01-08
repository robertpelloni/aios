import { createPublicClient, http, formatEther, type PublicClient } from 'viem';
import { mainnet } from 'viem/chains';

export class WalletManager {
  private static instance: WalletManager;
  private publicClient: PublicClient;
  private connectedAddress: string | null = null;

  private constructor() {
    this.publicClient = createPublicClient({
      chain: mainnet,
      transport: http()
    });
  }

  public static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  public connect(address: string): void {
    if (!address.startsWith('0x')) {
      throw new Error('Invalid address format');
    }
    this.connectedAddress = address;
    console.log(`Wallet connected: ${address}`);
  }

  public disconnect(): void {
    this.connectedAddress = null;
    console.log('Wallet disconnected');
  }

  public getConnectedAddress(): string | null {
    return this.connectedAddress;
  }

  public async getBalance(address?: string): Promise<string> {
    const targetAddress = address || this.connectedAddress;
    
    if (!targetAddress) {
      throw new Error('No address provided and no wallet connected');
    }

    const balance = await this.publicClient.getBalance({ 
      address: targetAddress as `0x${string}` 
    });
    
    return formatEther(balance);
  }
}
