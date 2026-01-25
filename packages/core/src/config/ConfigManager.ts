import fs from 'fs';
import path from 'path';

export class ConfigManager {
    private configPath: string;

    constructor() {
        // Use user home or workspace root? 
        // MCPServer uses process.cwd()/.borg/skills
        // Let's use process.cwd()/.borg/config.json
        this.configPath = path.join(process.cwd(), '.borg', 'config.json');
    }

    loadConfig(): any {
        try {
            if (fs.existsSync(this.configPath)) {
                const content = fs.readFileSync(this.configPath, 'utf-8');
                return JSON.parse(content);
            }
        } catch (e) {
            console.error("[ConfigManager] Failed to load config:", e);
        }
        return null;
    }

    saveConfig(config: any) {
        try {
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            console.log("[ConfigManager] Saved config to", this.configPath);
        } catch (e) {
            console.error("[ConfigManager] Failed to save config:", e);
        }
    }
}
