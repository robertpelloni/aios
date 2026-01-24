import type { MCPServer } from "../MCPServer.js";
export declare class Director {
    private server;
    private llmService;
    private council;
    private lastSelection;
    private log;
    constructor(server: MCPServer);
    /**
     * Starts an autonomous task loop.
     * @param goal The high-level objective.
     * @param maxSteps Safety limit to prevent infinite loops.
     */
    executeTask(goal: string, maxSteps?: number): Promise<string>;
    /**
     * Starts a continuous watchdog loop to monitor Antigravity/Terminal state.
     */
    startWatchdog(maxCycles?: number): Promise<string>;
    /**
     * Starts a Chat Daemon that acts as a bridge.
     * It polls 'vscode_read_selection'. If text changes, it treats it as a prompt.
     */
    startChatDaemon(): Promise<string>;
    private isAutoDriveActive;
    private currentStatus;
    /**
     * Stops the Auto-Drive loop.
     */
    stopAutoDrive(): void;
    /**
     * Gets the current operational status.
     */
    getStatus(): {
        active: boolean;
        status: "IDLE" | "THINKING" | "DRIVING";
        goal: string;
    };
    /**
     * Starts the Self-Driving Mode.
     * 1. Reads task.md
     * 2. Finds next task.
     * 3. Submits to Chat.
     * 4. Auto-Accepts (periodically presses Alt+Enter via native_input).
     */
    startAutoDrive(): Promise<string>;
    private autoAccepterInterval;
    private lastActivityTime;
    private consecutiveIdleChecks;
    private lastEncouragementTime;
    private detectConversationState;
    private respondToState;
    private sendGemmaEncouragement;
    recordActivity(): void;
    private startAutoAccepter;
    private stopAutoAccepter;
    private think;
    private heuristicFallback;
}
//# sourceMappingURL=Director.d.ts.map