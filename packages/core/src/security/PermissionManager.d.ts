import { DebateResult } from '../agents/Council.js';
import { ModelSelector } from '../ModelSelector.js';
export type AutonomyLevel = 'low' | 'medium' | 'high';
export declare class PermissionManager {
    autonomyLevel: AutonomyLevel;
    private council?;
    constructor(autonomyLevel?: AutonomyLevel, modelSelector?: ModelSelector);
    /**
     * Consult the Council for a sensitive action.
     * Returns the debate result with approval status and reasoning.
     */
    consultCouncil(toolName: string, args: any): Promise<DebateResult | null>;
    setAutonomyLevel(level: AutonomyLevel): void;
    getAutonomyLevel(): AutonomyLevel;
    /**
     * Determines if a tool call requires user approval.
     */
    checkPermission(toolName: string, args: any): 'APPROVED' | 'DENIED' | 'NEEDS_CONSULTATION';
    private assessRisk;
}
//# sourceMappingURL=PermissionManager.d.ts.map