
import fs from 'fs/promises';
import path from 'path';

/**
 * AutoConfig (Universal Client)
 * Automatically detects environment (Kubernetes, Docker, Local) 
 * and configures the MCP client accordingly.
 * Ported/Stubbed from 'mcpenetes' logic.
 */
export class AutoConfig {
    static async detectEnvironment(): Promise<'k8s' | 'docker' | 'local'> {
        if (process.env.KUBERNETES_SERVICE_HOST) {
            return 'k8s';
        }
        try {
            await fs.access('/.dockerenv');
            return 'docker';
        } catch {
            return 'local';
        }
    }

    static async generateConfig() {
        const env = await this.detectEnvironment();
        console.log(`[AutoConfig] Detected Environment: ${env}`);

        const config = {
            mcpServers: {
                borg: {
                    command: "node",
                    args: ["packages/core/dist/index.js"],
                    env: process.env
                }
            },
            ui: {
                theme: env === 'k8s' ? 'dark-enterprise' : 'dark-modern',
                logs: env === 'local' ? 'verbose' : 'json'
            }
        };

        if (env === 'k8s') {
            // In K8s, we might communicate via Service DNS
            config.mcpServers.borg = {
                url: "http://borg.default.svc.cluster.local:3000/sse",
                transport: "sse"
            } as any;
        }

        return config;
    }
}
