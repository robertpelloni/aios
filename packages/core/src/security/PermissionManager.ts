
export type AutonomyLevel = 'low' | 'medium' | 'high';

export class PermissionManager {
    public autonomyLevel: AutonomyLevel;

    constructor(autonomyLevel: AutonomyLevel = 'low') {
        this.autonomyLevel = autonomyLevel;
    }

    setAutonomyLevel(level: AutonomyLevel) {
        this.autonomyLevel = level;
    }

    /**
     * Determines if a tool call requires user approval.
     * @returns true if approved, false if approval required.
     */
    checkPermission(toolName: string, args: any): boolean {
        // High Autonomy (Autopilot): Trust the agent completely.
        if (this.autonomyLevel === 'high') {
            return true;
        }

        const risk = this.assessRisk(toolName, args);

        if (this.autonomyLevel === 'medium') {
            // Medium: Allow low/medium risk, block high risk
            return risk !== 'high';
        }

        // Low Autonomy: Block everything except very safe info tools
        return risk === 'low';
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
        if (toolName.includes('read_file') || toolName.includes('list_directory')) {
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
