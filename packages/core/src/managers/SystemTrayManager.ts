import SysTray from '@3xpo/systray';
import open from 'open';
import path from 'path';
import fs from 'fs';
import { HealthService } from '../services/HealthService.js';
import { AgentManager } from './AgentManager.js';
import { McpManager } from './McpManager.js';

interface TrayItem {
    title: string;
    tooltip: string;
    checked: boolean;
    enabled: boolean;
}

interface TrayAction {
    type: string;
    item: TrayItem;
    seq_id: number;
}

export class SystemTrayManager {
    private systray: any;
    private updateInterval: NodeJS.Timeout | null = null;

    constructor(
        private healthService: HealthService,
        private agentManager: AgentManager,
        private mcpManager: McpManager,
        private rootDir: string
    ) {
        // @ts-ignore
        this.systray = new SysTray.default({
            menu: {
                icon: this.loadIcon(),
                title: "AIOS Hub",
                tooltip: "AIOS Hub Running",
                items: [
                    {
                        title: "Open Dashboard",
                        tooltip: "Open AIOS Dashboard in Browser",
                        checked: false,
                        enabled: true
                    },
                    {
                        title: "Status: Running",
                        tooltip: "System Status",
                        checked: false,
                        enabled: false
                    },
                    {
                        title: "Exit",
                        tooltip: "Shutdown AIOS Hub",
                        checked: false,
                        enabled: true
                    }
                ]
            },
            debug: false,
            copyDir: false
        });

        this.systray.onClick((action: TrayAction) => {
            if (action.item.title === 'Open Dashboard') {
                open('http://localhost:3000');
            } else if (action.item.title === 'Exit') {
                this.stop();
                process.exit(0);
            }
        });
    }

    private loadIcon(): string {
        try {
            const iconPath = path.join(this.rootDir, 'assets', 'icon.png');
            if (fs.existsSync(iconPath)) {
                return fs.readFileSync(iconPath).toString('base64');
            }
            return "";
        } catch (e) {
            console.error("Failed to load tray icon:", e);
            return "";
        }
    }

    public start() {
        console.log('[SystemTray] Starting System Tray...');
        this.systray.ready().then(() => {
            console.log('[SystemTray] Tray Icon Active');
            this.updateMenu();
            this.updateInterval = setInterval(() => this.updateMenu(), 5000);
        }).catch((err: Error) => {
            console.error('[SystemTray] Failed to start tray:', err);
        });
    }

    public stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.systray.kill(false);
    }

    private updateMenu() {
        const status = this.healthService.getSystemStatus();
    }
}
