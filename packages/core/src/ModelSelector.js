import fs from 'fs';
import path from 'path';
// Default Fallback
const DEFAULT_CHAINS = {
    worker: [
        { provider: 'lmstudio', modelId: 'local' },
        { provider: 'ollama', modelId: 'gemma:2b' }
    ],
    supervisor: [
        { provider: 'lmstudio', modelId: 'local' },
        { provider: 'ollama', modelId: 'gemma:2b' }
    ]
};
const COOL_DOWN_MS = 60 * 1000;
export class ModelSelector {
    modelStates = new Map();
    configPath;
    constructor() {
        // Assume running fro dist/ so go up to config
        this.configPath = path.resolve(process.cwd(), 'packages/core/config/council.json');
        console.log("ModelSelector initialized. Config Path:", this.configPath);
    }
    reportFailure(modelId) {
        console.warn(`[ModelSelector] Reporting failure for ${modelId}. Marking as DEPLETED.`);
        this.modelStates.set(modelId, {
            isDepleted: true,
            depletedAt: Date.now(),
            retryAfter: Date.now() + COOL_DOWN_MS
        });
    }
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                return JSON.parse(raw);
            }
        }
        catch (e) {
            console.error("Failed to load council config:", e);
        }
        return null;
    }
    async selectModel(req) {
        let chain = DEFAULT_CHAINS.worker;
        // Dynamic Load
        const config = this.loadConfig();
        if (config && config.members) {
            // Map council members to a chain
            chain = config.members.map((m) => ({
                provider: m.provider,
                modelId: m.modelId,
                systemPrompt: m.systemPrompt
            }));
        }
        else if (req.taskType === 'supervisor' || req.taskComplexity === 'high') {
            chain = DEFAULT_CHAINS.supervisor;
        }
        // Iterate
        for (const candidate of chain) {
            const status = this.modelStates.get(candidate.modelId);
            if (status && status.isDepleted) {
                if (Date.now() > (status.retryAfter || 0)) {
                    this.modelStates.delete(candidate.modelId);
                }
                else {
                    continue;
                }
            }
            return {
                provider: candidate.provider,
                modelId: candidate.modelId,
                reason: status ? 'RECOVERED' : 'PRIMARY_CHOICE',
                // @ts-ignore
                systemPrompt: candidate.systemPrompt
            };
        }
        console.error("[ModelSelector] ALL MODELS DEPLETED! Returning default fallback.");
        return {
            provider: 'lmstudio',
            modelId: 'local',
            reason: 'EMERGENCY_FALLBACK'
        };
    }
}
