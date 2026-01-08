import { EventEmitter } from 'events';
import { HardwareManager } from './HardwareManager.js';
import { WalletManager } from './WalletManager.js';

export class EconomyManager extends EventEmitter {
    private balance: number = 0;
    private walletAddress: string = "bob_wallet_mock_" + Math.random().toString(36).substring(7);
    private hardwareManager: HardwareManager;
    private walletManager: WalletManager;

    constructor() {
        super();
        this.hardwareManager = HardwareManager.getInstance();
        this.walletManager = WalletManager.getInstance();
    }

    async mine(activityData: { steps?: number, heartRate?: number, danceScore?: number, nodeUptime?: number }) {
        const hardwarePotential = await this.hardwareManager.calculateHashratePotential();
        const hardwareMultiplier = 1 + (hardwarePotential / 10000);

        let reward = 0;
        if (activityData.steps) reward += activityData.steps / 1000;
        if (activityData.danceScore) reward += activityData.danceScore / 100;

        if (activityData.nodeUptime) reward += activityData.nodeUptime / 3600;

        reward = reward * hardwareMultiplier;

        if (reward > 0) {
            this.balance += reward;
            this.emit('transaction', { type: 'mining', amount: reward, timestamp: new Date() });
            
            return `Mined ${reward.toFixed(4)} Bobcoin! (Hardware Boost: ${hardwareMultiplier.toFixed(2)}x) New Balance: ${this.balance.toFixed(4)}`;
        }

        return "No reward earned. Keep dancing or seeding!";
    }

    async connectWallet(address: string) {
        try {
            this.walletManager.connect(address);
            return `Connected external wallet: ${address}`;
        } catch (error: any) {
            return `Failed to connect wallet: ${error.message}`;
        }
    }

    async getExternalBalance() {
        const address = this.walletManager.getConnectedAddress();
        if (!address) return "No external wallet connected.";
        
        try {
            const balance = await this.walletManager.getBalance();
            return `External Wallet (${address}): ${balance} ETH`;
        } catch (error: any) {
            return `Failed to fetch external balance: ${error.message}`;
        }
    }

    getBalance() {
        return {
            address: this.walletAddress,
            balance: this.balance,
            currency: "BOB",
            externalWallet: this.walletManager.getConnectedAddress() || "Not Connected"
        };
    }

    getToolDefinitions() {
        return [
            {
                name: "submit_activity",
                description: "Submit physical activity data to mine Bobcoin (Proof of Dance).",
                inputSchema: {
                    type: "object",
                    properties: {
                        steps: { type: "number" },
                        danceScore: { type: "number" }
                    }
                }
            },
            {
                name: "get_balance",
                description: "Check current Bobcoin wallet balance.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "connect_wallet",
                description: "Connect an external EVM wallet to the node.",
                inputSchema: {
                    type: "object",
                    properties: {
                        address: { type: "string", description: "The 0x public address of the wallet" }
                    },
                    required: ["address"]
                }
            },
            {
                name: "get_external_balance",
                description: "Get the ETH balance of the connected external wallet.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "get_hardware_stats",
                description: "Get local hardware statistics for mining potential.",
                inputSchema: { type: "object", properties: {} }
            }
        ];
    }
}
