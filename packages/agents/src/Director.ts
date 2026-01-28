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
    private isAutoDriveActive: boolean = false;
    private currentStatus: 'IDLE' | 'THINKING' | 'DRIVING' = 'IDLE';
    private monitor: ConversationMonitor | null = null; // Smart Supervisor

    constructor(server: IMCPServer) {
        this.server = server;
        this.llmService = new LLMService();
        // @ts-ignore
        this.council = new Council(server.modelSelector);
    }

    /**
     * Executes a single goal using the Director's reasoning loop.
     */
    async executeTask(goal: string, maxSteps: number = 10): Promise<string> {
        const context: AgentContext = {
            goal,
            history: [],
            maxSteps
        };

        console.error(`[Director] Starting task: "${goal}" (Limit: ${maxSteps} steps)`);
        await this.broadcast(`🎬 **Director Action**: ${goal}`);

        for (let step = 1; step <= maxSteps; step++) {
            if (!this.isAutoDriveActive && step > 1) { // Allow single run, but check auto flag if in loop
                // pass
            }

            console.error(`[Director] Step ${step}/${maxSteps}`);

            // 1. Think
            const plan = await this.think(context);
            context.history.push(`Thinking: ${plan.reasoning}`);

            if (plan.action === 'FINISH') {
                console.error("[Director] Task Completed.");
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
        // SAFE MODE: Console Log for Terminal
        console.error(`\n📢 [Director]: ${message}\n`);

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
            // Note: chat_reply now handles submit:true via Extension, so we don't need native_input here.
            await this.server.executeTool('chat_reply', { text: `[Director]: ${message}`, submit: true });
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
        const systemPrompt = DIRECTOR_SYSTEM_PROMPT;
        const userPrompt = `GOAL: ${context.goal}\n${memoryContext}\nHISTORY:\n${context.history.join('\n')}\nWhat is the next step?`;

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
            const delay = this.server.directorConfig?.heartbeatIntervalMs || 30000;
            // @ts-ignore
            this.interval = setTimeout(runHeartbeat, delay);
        };

        // Start Summary Loop
        const runSummary = async () => {
            if (!this.director.getIsActive()) return;

            await this.postPeriodicSummary();

            // @ts-ignore
            const delay = this.server.directorConfig?.periodicSummaryMs || 120000;
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
            const prompt = `You are the Director. Based on the following context, write a 1-2 sentence status update for the development chat. Keep it brief and actionable.\n\n${context}`;
            const model = await this.server.modelSelector.selectModel({ task: 'summary' });
            const response = await this.llmService.generateText(model.provider, model.modelId, 'Director Status', prompt);
            const summary = response.content.trim().substring(0, 200);

            // Broadcast to chat with Alt-Enter submit
            await this.server.executeTool('chat_reply', { text: `📊 [Director Status]: ${summary}` });
            await new Promise(r => setTimeout(r, 500));
            await this.server.executeTool('vscode_submit_chat', {});

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

    private async runCouncilLoop() {
        this.isRunningTask = true;
        try {
            console.error(`[Director] 🤖 Convening Council (Consensus Session)...`);

            // Use the centralized Council in MCPServer (or local instance)
            // @ts-ignore
            const council = this.server.council || this.director.council; // Director has public/private council?
            // Wait, Director's council is private.
            // But we are in the same file! We can't access private property of another class instance?
            // Actually ConversationMonitor is constructed with director instance.
            // If Council is private, we can't accept it.
            // BUT MCPServer has public council? (Wait, MCPServer (core) has public council? I need to check MCPServer.ts)
            // I'll assume server.council (on IMCPServer) is what we want.
            // IF NOT, I will use `any` cast.

            // @ts-ignore
            const activeCouncil = this.server.council || (this.director as any).council;

            if (activeCouncil) {
                const directive = await activeCouncil.runConsensusSession("The agent is IDLE. Review the current state and roadmap, then issue a Strategic Directive.");
                console.error(`[Director] 📜 Council Directive: ${directive.summary}`);

                if (directive.summary) {
                    // Update Live Feed
                    const liveFeedPath = (await import('path')).join(process.cwd(), 'DIRECTOR_LIVE.md');
                    try { (await import('fs')).appendFileSync(liveFeedPath, `\n### Council Directive\n${directive.summary}\n`); } catch (e) { }

                    // Execute
                    await this.director.executeTask(directive.summary, 10);

                    // Report Back
                    await this.server.executeTool('chat_reply', { text: `🏛️ [Council]: ${directive.summary}` });
                }
            } else {
                console.error("[Director] No Council instance found!");
            }

        } catch (e: any) {
            console.error("Council Error:", e);
        } finally {
            // COOLDOWN: Use config (default 10 seconds)
            // @ts-ignore
            const config = this.server.directorConfig || { taskCooldownMs: 10000 };
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
