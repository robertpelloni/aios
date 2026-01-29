import type { IMCPServer } from "@borg/adk";
import { LLMService } from "@borg/ai";
import { Council } from "./Council.js";
import { DIRECTOR_SYSTEM_PROMPT } from "@borg/ai";

interface AgentContext {
    goal: string;
    history: string[];
    maxSteps: number;
}

export class Director {
    private server: IMCPServer;
    private llmService: LLMService;
    private council: Council;

    // Auto-Drive State
    private isAutoDriveActive: boolean = false; // SAFE START: Default to false
    private currentStatus: 'IDLE' | 'THINKING' | 'DRIVING' = 'IDLE';
    private monitor: ConversationMonitor | null = null; // Smart Supervisor

    // Execution State
    private activeGoal: string | null = null;
    private lastGoal: string | null = null;
    private lastGoalTime: number = 0;
    private currentStep: number = 0;
    private maxSteps: number = 0;
    private history: string[] = [];

    constructor(server: IMCPServer) {
        this.server = server;
        this.llmService = new LLMService();
        // @ts-ignore
        this.council = new Council(server.modelSelector);

        // SAFE MODE: Do not auto-start monitor
        console.log("[Director] 🛡️ Initialized in SAFE MODE. Auto-Drive is OFF.");
    }

    // Configuration
    private config = {
        defaultTopic: "Implement Roadmap Features",
        taskCooldownMs: 10000,
        heartbeatIntervalMs: 30000,
        periodicSummaryMs: 120000,
        pasteToSubmitDelayMs: 1000,
        acceptDetectionMode: 'polling' as 'polling' | 'state',
        pollingIntervalMs: 30000,
        // Personality & Custom Instructions
        persona: 'default' as 'default' | 'homie' | 'professional' | 'chaos',
        customInstructions: "" // User-defined hints/themes
    };

    public getConfig() {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<typeof this.config>) {
        this.config = { ...this.config, ...newConfig };
        // Trigger any side effects (e.g. restarting timers) if necessary
        if (this.monitor) {
            // this.monitor.updateConfig(this.config); // TODO: Implement if monitor needs it
        }
    }

    public getStatus() {
        return {
            active: this.isAutoDriveActive,
            status: this.currentStatus,
            goal: this.activeGoal,
            step: this.currentStep,
            totalSteps: this.maxSteps,
            lastHistory: this.history.slice(-3),
            config: this.config
        };
    }

    /**
     * Executes a single goal using the Director's reasoning loop.
     */
    async executeTask(goal: string, maxSteps: number = 10): Promise<string> {
        // Prevent Spam: If exact same goal as last time and finished recently, skip.
        if (this.activeGoal === goal || (this.history.length > 0 && this.lastGoal === goal && Date.now() - this.lastGoalTime < 60000)) {
            console.error(`[Director] 🚫 Skipping duplicate goal: "${goal}"`);
            return "Skipped duplicate goal.";
        }

        this.lastGoal = goal;
        this.lastGoalTime = Date.now();
        this.activeGoal = goal;
        this.maxSteps = maxSteps;
        this.history = [];
        this.currentStatus = 'DRIVING';

        const context: AgentContext = {
            goal,
            history: this.history,
            maxSteps
        };

        console.error(`[Director] Starting task: "${goal}" (Limit: ${maxSteps} steps)`);
        await this.broadcast(`🎬 **Director Action**: ${goal}`);

        for (let step = 1; step <= maxSteps; step++) {
            this.currentStep = step;
            if (!this.isAutoDriveActive && step > 1) { // Allow single run, but check auto flag if in loop
                // pass
            }

            console.error(`[Director] Step ${step}/${maxSteps}`);

            // 1. Think
            const plan = await this.think(context);
            context.history.push(`Thinking: ${plan.reasoning}`);

            if (plan.action === 'FINISH') {
                console.error("[Director] Task Completed.");
                this.activeGoal = null;
                this.currentStatus = this.isAutoDriveActive ? 'IDLE' : 'IDLE';
                return plan.result || "Task completed successfully.";
            }

            // 1b. Council Advice (Advisory but using Consensus Engine)
            const isHighAutonomy = this.server.permissionManager.getAutonomyLevel() === 'high';
            if (!isHighAutonomy && !plan.toolName.startsWith('vscode_read') && !plan.toolName.startsWith('list_')) {
                // Quick consult, no blocking UI
                // Uses the consensus engine for a quick check
                const debate = await this.council.runConsensusSession(`Action: ${plan.toolName}. Reasoning: ${plan.reasoning}`);
                context.history.push(`Council Advice: ${debate.summary}`);
                console.error(`[Director] 🛡️ Council Advice: ${debate.summary}`);
            }

            // 2. Act
            try {
                console.error(`[Director] Executing: ${plan.toolName}`);
                const result = await this.server.executeTool(plan.toolName, plan.params);
                const observation = JSON.stringify(result);
                context.history.push(`Action: ${plan.toolName}(${JSON.stringify(plan.params)})`);
                context.history.push(`Observation: ${observation}`);
            } catch (error: any) {
                console.error(`[Director] Action Failed: ${error.message}`);
                context.history.push(`Error: ${error.message}`);
            }
        }

        return "Task stopped: Max steps reached.";
    }

    /**
     * Starts the Autonomous Loop.
     * Unlike before, this DOES NOT rely on the Chat Input Box.
     * It runs internally and posts updates to Chat.
     */
    async startAutoDrive(): Promise<string> {
        if (this.isAutoDriveActive) {
            return "Auto-Drive is already active.";
        }
        this.isAutoDriveActive = true;
        this.currentStatus = 'DRIVING';

        // Init Live Feed
        try {
            const fs = await import('fs');
            const path = await import('path');
            fs.writeFileSync(path.join(process.cwd(), 'DIRECTOR_LIVE.md'), '# 🎬 Director Live Feed\nWaiting for action...\n');
        } catch (e) { }

        console.error(`[Director] Starting Auto-Drive (Internal Loop)...`);
        await this.broadcast("⚡ **Auto-Drive Engaged**\nI am now operating autonomously. The Council will direct the workflow.");

        // Start Monitor to handle Idle states by triggering Council
        this.startMonitor();

        return "Auto-Drive Started.";
    }

    stopAutoDrive() {
        console.error("[Director] Stopping Auto-Drive...");
        this.isAutoDriveActive = false;
        this.currentStatus = 'IDLE';
        if (this.monitor) {
            this.monitor.stop();
            this.monitor = null;
        }
    }

    /**
     * The heartbeat of Autonomy.
     * Checks for "Needs Approval" (Terminal) or "Idle" (Needs Direction).
     */
    private startMonitor() {
        this.monitor = new ConversationMonitor(this.server, this.llmService, this);
        this.monitor.start();
    }

    // --- Helpers ---

    // --- Helpers ---

    public async broadcast(message: string) {
        // In a real system, this would push to the UI via WebSocket
        console.log(`\n📢 [DIRECTOR BROADCAST]: ${message}\n`);
        // LIVE FEED: Write to DIRECTOR_LIVE.md for IDE Visibility
        try {
            const fs = await import('fs');
            const path = await import('path');
            const feedPath = path.join(process.cwd(), 'DIRECTOR_LIVE.md');
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `\n### [${timestamp}] Director\n${message}\n`;

            // Append to file
            fs.appendFileSync(feedPath, logEntry);
        } catch (e) { }

        // LIVE FEED: Paste to Chat Window and auto-submit
        try {
            console.error(`[Director] 📤 Broadcasting to chat: ${message.substring(0, 50)}...`);
            // Paste to chat (Extension focuses chat window)
            // Note: We DO NOT submit status updates automatically, as this causes a feedback loop
            // where the Agent treats its own status message as a new User Command.
            await this.server.executeTool('chat_reply', { text: `[Director]: ${message}`, submit: false });
        } catch (e: any) {
            console.error(`[Director] ❌ Broadcast Error: ${e.message}`);
        }
    }

    private async think(context: AgentContext): Promise<any> {
        let memoryContext = "";
        try {
            // @ts-ignore
            const memoryResult = await this.server.executeTool("search_codebase", { query: context.goal });
            // @ts-ignore
            const memoryText = memoryResult.content?.[0]?.text || "";
            if (memoryText && !memoryText.includes("No matches")) {
                memoryContext = `\nRELEVANT CODEBASE CONTEXT:\n${memoryText.substring(0, 2000)}\n`;
            }
        } catch (e) { }

        const model = await this.server.modelSelector.selectModel({ taskComplexity: 'medium' });

        // Pinned Context Injection
        // @ts-ignore
        const pinnedContext = this.server.contextManager ? this.server.contextManager.getContextPrompt() : "";

        // Shell History Injection
        let shellContext = "";
        try {
            // @ts-ignore
            if (this.server.shellService) {
                // @ts-ignore
                const history = await this.server.shellService.getHistory(10); // Get last 10 commands
                if (history && history.length > 0) {
                    shellContext = `\nRECENT SHELL HISTORY:\n${history.join('\n')}\n`;
                }
            }
        } catch (e) { }

        let systemPrompt = DIRECTOR_SYSTEM_PROMPT;

        // Inject Personality
        if (this.config.persona === 'homie') {
            systemPrompt += "\n\nSTYLE: Informal, friendly, use emojis (🤙, 🚀). concise.";
        } else if (this.config.persona === 'professional') {
            systemPrompt += "\n\nSTYLE: Formal, precise, no emojis. Focus on business value.";
        } else if (this.config.persona === 'chaos') {
            systemPrompt += "\n\nSTYLE: Chaotic goodness. Maximally creative. Unpredictable but functional.";
        }

        // Inject User Custom Instructions
        if (this.config.customInstructions && this.config.customInstructions.trim().length > 0) {
            systemPrompt += `\n\nUSER OVERRIDE INSTRUCTIONS:\n${this.config.customInstructions}\n(You MUST prioritize these instructions over default styles)`;
        }

        const userPrompt = `GOAL: ${context.goal}\n${memoryContext}\n${pinnedContext}\n${shellContext}\nHISTORY:\n${context.history.join('\n')}\nWhat is the next step?`;

        try {
            const response = await this.llmService.generateText(model.provider, model.modelId, systemPrompt, userPrompt);
            let jsonStr = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            return this.heuristicFallback(context);
        }
    }

    private heuristicFallback(context: AgentContext): any {
        const goal = context.goal.toLowerCase();
        const lastEntry = context.history[context.history.length - 1] || "";

        // Safety: If no idea, list files
        if (!lastEntry) return { action: 'CONTINUE', toolName: 'list_files', params: { path: process.cwd() }, reasoning: "Looking around." };

        // Detect loops
        if (context.history.length > 5 && lastEntry === context.history[context.history.length - 3]) {
            return { action: 'FINISH', toolName: '', params: {}, result: "Stuck in loop.", reasoning: "Loop detected." };
        }

        return { action: 'FINISH', toolName: '', params: {}, result: "Heuristic finish.", reasoning: "No LLM response." };
    }

    // Expose for Monitor
    public getIsActive() { return this.isAutoDriveActive; }
}

class ConversationMonitor {
    private server: IMCPServer;
    private llmService: LLMService;
    private director: Director;
    private interval: NodeJS.Timeout | null = null;
    private summaryInterval: NodeJS.Timeout | null = null; // 2-min summary timer
    private lastActivityTime: number = Date.now();
    private isRunningTask: boolean = false;

    constructor(server: IMCPServer, llmService: LLMService, director: Director) {
        this.server = server;
        this.llmService = llmService;
        this.director = director;
    }

    start() {
        if (this.interval) clearTimeout(this.interval); // Cleanup old standard
        if (this.summaryInterval) clearTimeout(this.summaryInterval);

        this.isRunningTask = false;

        // Start Heartbeat Loop
        const runHeartbeat = async () => {
            if (!this.director.getIsActive()) return;

            await this.checkAndAct();

            // @ts-ignore
            const config = this.director.getConfig();
            const delay = config.heartbeatIntervalMs || 30000;
            // @ts-ignore
            this.interval = setTimeout(runHeartbeat, delay);
        };

        // Start Summary Loop
        const runSummary = async () => {
            if (!this.director.getIsActive()) return;

            await this.postPeriodicSummary();

            // @ts-ignore
            const config = this.director.getConfig();
            const delay = config.periodicSummaryMs || 120000;
            // @ts-ignore
            this.summaryInterval = setTimeout(runSummary, delay);
        };

        // Kickoff
        // @ts-ignore
        this.interval = setTimeout(runHeartbeat, 1000);
        // @ts-ignore
        this.summaryInterval = setTimeout(runSummary, 60000);

        console.log(`[ConversationMonitor] Started dynamic loops.`);
    }

    stop() {
        if (this.interval) clearTimeout(this.interval);
        if (this.summaryInterval) clearTimeout(this.summaryInterval);
        this.interval = null;
        this.summaryInterval = null;
    }

    private lastSummary: string = "";

    /**
     * Posts a periodic summary to the chat to keep the development loop alive.
     * Reads context files (README, ROADMAP, DIRECTOR_LIVE) and generates summary.
     */
    private async postPeriodicSummary() {
        if (!this.director.getIsActive()) return;
        if (this.isRunningTask) return; // Don't interrupt ongoing work

        try {
            const fs = await import('fs');
            const path = await import('path');
            const cwd = process.cwd();

            // Read context files
            let context = '## Current Context\n';
            const readFile = (name: string) => {
                try {
                    const p = path.join(cwd, name);
                    if (fs.existsSync(p)) {
                        const content = fs.readFileSync(p, 'utf8').substring(0, 1000);
                        return `### ${name}\n${content}\n`;
                    }
                } catch (e) { }
                return '';
            };

            context += readFile('README.md');
            context += readFile('docs/ROADMAP.md');
            context += readFile('docs/USER_DIRECTIVES_INBOX.md');
            context += readFile('DIRECTOR_LIVE.md');

            // Generate brief summary via LLM
            // Generate brief summary via LLM
            const config = this.director.getConfig();
            const prompt = `You are the Director. Based on the following context, write a 1-sentence status update for the development chat. 
            
            Current Default Focus: "${config.defaultTopic}"
            
            Crucial: If the system is waiting for the Council or User, say exactly what you are waiting for, but add an encouraging remark about the Default Focus.
            Example: "Standing by for user input. Ready to proceed with Roadmap features."
            
            If nothing has changed, output "SAME".
            Tone: Brief, actionable, and encouraging.
            \n\n${context}`;

            const model = await this.server.modelSelector.selectModel({ task: 'summary' });
            const response = await this.llmService.generateText(model.provider, model.modelId, 'Director Status', prompt);
            let summary = response.content.trim().substring(0, 200);

            if (summary === "SAME" || summary === this.lastSummary) {
                console.log("[Director] Status unchanged, skipping broadcast.");
                return;
            }

            this.lastSummary = summary;

            // Broadcast to chat with Alt-Enter submit
            await this.server.executeTool('chat_reply', { text: `📊 [Director Status]: ${summary}`, submit: false });
            // await new Promise(r => setTimeout(r, 500));
            // await this.server.executeTool('vscode_submit_chat', {});

            console.error(`[Director] 📊 Posted periodic summary.`);
        } catch (e: any) {
            console.error(`[Director] Summary Error: ${e.message}`);
        }
    }

    private async checkAndAct() {
        console.error(`[Director] ❤️ Monitor Heartbeat (Active: ${this.director.getIsActive()})`); // DEBUG
        if (!this.director.getIsActive()) {
            this.stop();
            return;
        }

        // [Phase 9] Healer Logic: Detect Failures
        // @ts-ignore
        if (this.server.autoTestService && !this.isRunningTask) {
            // @ts-ignore
            const results = this.server.autoTestService.testResults;
            if (results) {
                for (const [fpath, info] of results.entries()) {
                    // Check if fail within last 60s
                    if (info.status === 'fail' && Date.now() - info.timestamp < 60000) {
                        console.error(`[Director:Healer] 🚑 Detected failure: ${fpath}`);
                        await this.healFailure(fpath, info.output || "No output captured.");
                    }
                }
            }
        }

        // Accept pending changes via Extension (Safe, no terminal spam)
        // Only uses WebSocket bridge to VS Code Extension
        try { await this.server.executeTool('vscode_execute_command', { command: 'interactive.acceptChanges' }); } catch (e) { }

        // PERIODIC ALT+ENTER: Click Accept buttons that pause development
        // This runs every 30 seconds (heartbeat interval) to keep things moving
        try { await this.server.executeTool('native_input', { keys: 'alt+enter' }); } catch (e) { }

        // If Director is busy executing a task, don't interrupt (unless stuck?)
        if (this.isRunningTask) {
            return;
        }

        const state = await this.detectState();
        await this.respondToState(state);
    }

    private async detectState(): Promise<'NEEDS_APPROVAL' | 'IDLE' | 'BUSY'> {
        // 1. Check Terminal for "Approve?" (Explicit)
        try {
            // @ts-ignore
            const termResult = await this.server.executeTool('vscode_read_terminal', {});
            // @ts-ignore
            const content = (termResult.content?.[0]?.text || "").trim().slice(-500);
            if (/(?:approve\?|continue\?|\[y\/n\])/i.test(content)) return 'NEEDS_APPROVAL';
        } catch (e) { }

        // 0. Check User Activity (Anti-Hijack)
        // @ts-ignore
        const lastUserActive = this.server.lastUserActivityTime || 0;
        if (Date.now() - lastUserActive < 5000) {
            // User is typing/clicking. Agent must wait.
            // console.error("[Monitor] User Active - Agent Yielding");
            return 'BUSY';
        }

        // 2. Check Time
        const idleTime = Date.now() - this.lastActivityTime;

        // 3. Infer UI Blockage (Inline Chat / Alt-Enter)
        // If we are technically "Running a Task" but have been idle for > 5s, 
        // we are likely waiting for an "Alt-Enter" confirmation in the UI.
        if (this.isRunningTask && idleTime > 5000) {
            console.error("[Director] ⚠️ Mid-Task Stall detected (UI Block?). Triggering Approval...");
            return 'NEEDS_APPROVAL';
        }

        // 4. True Idle (Council)
        if (idleTime > 10000 && !this.isRunningTask) return 'IDLE';

        return 'BUSY';
    }

    private async respondToState(state: string) {
        if (state === 'NEEDS_APPROVAL') {
            console.error("[Director] 🟢 Auto-Approving (Sending 'y' + Enter + Alt-Enter)...");

            // 1. CLI Terminal Approval
            try { await this.server.executeTool('native_input', { keys: 'y' }); } catch (e: any) { console.error(`[Auto-Approve] 'y' failed: ${e.message}`); }

            await new Promise(r => setTimeout(r, 500)); // Wait 500ms

            try { await this.server.executeTool('native_input', { keys: 'enter' }); } catch (e: any) { console.error(`[Auto-Approve] 'enter' 1 failed: ${e.message}`); }

            await new Promise(r => setTimeout(r, 500)); // Double Tap
            try { await this.server.executeTool('native_input', { keys: 'enter' }); } catch (e: any) { console.error(`[Auto-Approve] 'enter' 2 failed: ${e.message}`); }

            // 2. VS Code UI Approval (Fallback)
            await new Promise(r => setTimeout(r, 500));
            try { await this.server.executeTool('native_input', { keys: 'alt+enter' }); } catch (e: any) { console.error(`[Auto-Approve] 'alt+enter' failed: ${e.message}`); }

            // 3. Command Palette / Inline Chat
            try { await this.server.executeTool('vscode_execute_command', { command: 'workbench.action.terminal.chat.accept' }); } catch (e) { }
            try { await this.server.executeTool('vscode_execute_command', { command: 'interactive.acceptChanges' }); } catch (e) { }

            this.lastActivityTime = Date.now();
        }
        else if (state === 'IDLE') {
            // IDLE -> Council Meeting -> Execution
            await this.runCouncilLoop();
            this.lastActivityTime = Date.now();
        }
    }

    private lastDirective: string | null = null;

    private async runCouncilLoop() {
        this.isRunningTask = true;
        try {
            console.error(`[Director] 🤖 Convening Council (Consensus Session)...`);

            // @ts-ignore
            const activeCouncil = this.server.council || (this.director as any).council;

            if (activeCouncil) {
                const previousContext = this.lastDirective ? `Previous Directive was: "${this.lastDirective}". The Director just finished this or is IDLE.` : "";
                const prompt = `The agent is IDLE. ${previousContext} Review state. If the previous directive was just completed or failed, provide a NEW directive. If no work is needed, reply 'DIRECTIVE: STANDBY'.`;

                const directive = await activeCouncil.runConsensusSession(prompt);
                console.error(`[Director] 📜 Council Directive: ${directive.summary}`);

                if (directive.summary && !directive.summary.includes("STANDBY")) {
                    // Prevent Loop at the Source
                    if (directive.summary === this.lastDirective) {
                        console.error("[Director] 🛑 Council repeated same directive. Sleeping.");
                    } else {
                        this.lastDirective = directive.summary;

                        // Update Live Feed
                        const liveFeedPath = (await import('path')).join(process.cwd(), 'DIRECTOR_LIVE.md');
                        try { (await import('fs')).appendFileSync(liveFeedPath, `\n### Council Directive\n${directive.summary}\n`); } catch (e) { }

                        // Execute
                        await this.director.executeTask(directive.summary, 10);

                        // Report Back
                        await this.server.executeTool('chat_reply', { text: `🏛️ [Council]: ${directive.summary}`, submit: false });
                    }
                }
            } else {
                console.error("[Director] No Council instance found!");
            }

        } catch (e: any) {
            console.error("Council Error:", e);
        } finally {
            // COOLDOWN: Use config (default 10 seconds)
            // @ts-ignore
            const config = this.director.getConfig();
            const cooldown = config.taskCooldownMs || 10000;
            console.error(`[Director] ⏸️ Cooldown: ${cooldown / 1000} seconds before next Council meeting...`);
            await new Promise(r => setTimeout(r, cooldown));
            this.isRunningTask = false;
        }
    }

    private async healFailure(filePath: string, error: string) {
        console.error(`[Director:Healer] Triggering repair task for ${filePath}`);
        // Delegate to main execution loop
        // We use a high autonomy goal to fix the specific error
        await this.director.executeTask(`Fix the failed test in file: ${filePath}. The error was: ${error}. Analyze the code and error, then use 'replace_in_file' or 'write_file' to fix it. Verification: Run the test again to confirm it passes.`, 5);
    }
}
