import { Council, DebateResult } from '../agents/Council.js';
import { ModelSelector } from '../ModelSelector.js';

export type AutonomyLevel = 'low' | 'medium' | 'high';

export class PermissionManager {
    public autonomyLevel: AutonomyLevel;
    private council?: Council;

    constructor(autonomyLevel: AutonomyLevel = 'high', modelSelector?: ModelSelector) {
        this.autonomyLevel = autonomyLevel;
        if (modelSelector) {
            this.council = new Council(modelSelector);
        }
    }

    /**
     * Consult the Council for a sensitive action.
     * Returns the debate result with approval status and reasoning.
     */
    async consultCouncil(toolName: string, args: any): Promise<DebateResult | null> {
        if (!this.council) {
            console.warn('[PermissionManager] No Council configured. Skipping consultation.');
            return null;
        }

        const proposal = `Tool: ${toolName}\nArguments: ${JSON.stringify(args, null, 2)}`;
        console.log(`[PermissionManager] 🏛️ Consulting Council for: ${toolName}`);

        const result = await this.council.startDebate(proposal);
        return result;
    }

    setAutonomyLevel(level: AutonomyLevel) {
        this.autonomyLevel = level;
    }

    getAutonomyLevel(): AutonomyLevel {
        return this.autonomyLevel;
    }

    /**
     * Determines if a tool call requires user approval.
     */
    checkPermission(toolName: string, args: any): 'APPROVED' | 'DENIED' | 'NEEDS_CONSULTATION' {
        // High Autonomy: Trust completely
        if (this.autonomyLevel === 'high') {
            return 'APPROVED';
        }

        const risk = this.assessRisk(toolName, args);

        if (this.autonomyLevel === 'medium') {
            // Medium: Allow low/medium, consult on high
            if (risk === 'high') return 'NEEDS_CONSULTATION';
            return 'APPROVED';
        }

        // Low Autonomy: Block high, consult on medium, allow low
        if (risk === 'high') return 'DENIED';
        if (risk === 'medium') return 'NEEDS_CONSULTATION';
        return 'APPROVED';
    }

    private assessRisk(toolName: string, args: any): 'low' | 'medium' | 'high' {
        // High Risk Tools (Modifying system, network, sensitive reads)
        if (toolName.includes('write_file') ||
            toolName.includes('execute_command') ||
            toolName.includes('install') ||
            toolName.includes('git_push')) {

            // Nuance: 'ls' or 'echo' via execute_command might be low risk, 
            // but for now, we treat shell exec as high risk in low-autonomy mode.
            return 'high';
        }

        // Medium Risk (Read-only but potentially sensitive, or minor mods)
        if (toolName.includes('read_file') || toolName.includes('list_directory') || toolName.includes('read_page')) {
            return 'medium';
        }

        // Low Risk (Info, search, ping)
        if (toolName.includes('search') || toolName.includes('status') || toolName.includes('ping')) {
            return 'low';
        }

        // Default to high risk for unknown tools
        return 'high';
    }
}
