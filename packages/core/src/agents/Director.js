import { LLMService } from "../ai/LLMService.js";
import { Council } from "./Council.js";
export class Director {
    server;
    llmService;
    council;
    lastSelection = "";
    log(message) {
        console.log(message);
        this.server.broadcast('LOG_ENTRY', {
            source: 'Director',
            message: message,
            timestamp: Date.now()
        });
    }
    constructor(server) {
        this.server = server;
        this.llmService = new LLMService();
        // Instantiate Council with server's model selector
        this.council = new Council(server.modelSelector);
    }
    /**
     * Starts an autonomous task loop.
     * @param goal The high-level objective.
     * @param maxSteps Safety limit to prevent infinite loops.
     */
    async executeTask(goal, maxSteps = 10) {
        const context = {
            goal,
            history: [],
            maxSteps
        };
        this.log(`[Director] Starting task: "${goal}" (Limit: ${maxSteps} steps)`);
        for (let step = 1; step <= maxSteps; step++) {
            this.log(`[Director] Step ${step}/${maxSteps}`);
            // 1. Think: Determine next action
            const plan = await this.think(context);
            context.history.push(`Thinking: ${plan.reasoning}`);
            if (plan.action === 'FINISH') {
                this.log("[Director] Task Completed.");
                return plan.result || "Task completed successfully.";
            }
            // 1b. COUNCIL ADVICE (Advisory Only)
            // If the action is significant (not just reading), consult the Council for optimization/insight.
            // 1b. COUNCIL ADVICE (Advisory Only)
            // If the action is significant (not just reading), consult the Council for optimization/insight.
            // SKIP if Autonomy is High (Full Self-Driving)
            const isHighAutonomy = this.server.permissionManager.getAutonomyLevel() === 'high';
            if (!isHighAutonomy && !plan.toolName.startsWith('vscode_read') && !plan.toolName.startsWith('list_')) {
                const debate = await this.council.startDebate(`Action: ${plan.toolName}(${JSON.stringify(plan.params)}). Reasoning: ${plan.reasoning}`);
                // We add the Council's wisdom to the context history so the Agent can see it for the NEXT step.
                // But we DO NOT block the current action.
                context.history.push(`Council Advice for '${plan.toolName}': ${debate.summary}`);
                this.log(`[Director] 🛡️ Council Advice: ${debate.summary}`);
            }
            else if (isHighAutonomy) {
                this.log(`[Director] ⚡ High Autonomy: Skipping Council Debate for ${plan.toolName}`);
            }
            // 2. Act: Execute tool
            try {
                this.log(`[Director] Executing: ${plan.toolName}`);
                // Use MCPServer's unified tool executor
                const result = await this.server.executeTool(plan.toolName, plan.params);
                const observation = JSON.stringify(result);
                // 3. Observe: Record result
                context.history.push(`Action: ${plan.toolName}(${JSON.stringify(plan.params)})`);
                context.history.push(`Observation: ${observation}`);
            }
            catch (error) {
                console.error(`[Director] Action Failed: ${error.message}`);
                context.history.push(`Error: ${error.message}`);
            }
        }
        return "Task stopped: Max steps reached.";
    }
    /**
     * Starts a continuous watchdog loop to monitor Antigravity/Terminal state.
     */
    async startWatchdog(maxCycles = 20) {
        console.log(`[Director] Starting Watchdog (Limit: ${maxCycles} cycles)`);
        for (let i = 0; i < maxCycles; i++) {
            if (i % 5 === 0)
                console.log(`[Director] ❤️ HEARTBEAT - Watchdog Cycle ${i + 1}/${maxCycles} (Listening for prompts...)`);
            // 1. Read State (Terminal)
            try {
                // Use MCPServer's unified tool executor
                const termResult = await this.server.executeTool('vscode_read_terminal', {});
                // @ts-ignore
                const content = termResult.content?.[0]?.text || "";
                // 2. Analyze
                console.log("[Director] Analyzing Terminal Content:", content.substring(content.length - 200).replace(/\n/g, '\\n')); // Log last 200 chars
                // Auto-Approve [y/N], [Y/n], or specific keywords
                const approvalRegex = /(?:approve\?|continue\?|\[y\/n\]|\[yes\/no\]|do you want to run this command\?)/i;
                if (approvalRegex.test(content) || content.includes("Approve?") || content.includes("Do you want to continue?")) {
                    console.log("[Director] Detected Approval Prompt! Auto-Approving... (DISABLED due to focus issues)");
                    // DISABLED: Causing 'okIt...' typing loops in PowerShell.
                    // await this.server.executeTool('native_input', { keys: 'y' });
                    // await new Promise(r => setTimeout(r, 100)); // Small delay
                    // await this.server.executeTool('native_input', { keys: 'enter' });
                }
                // Keep-Alive / Resume?
                // If text says "Press any key to continue", do it.
                if (content.includes("Press any key to continue")) {
                    await this.server.executeTool('native_input', { keys: 'enter' });
                }
            }
            catch (e) {
                console.error("[Director] Watchdog Read Failed:", e);
            }
            // 3. Precise UI Interaction (VS Code API)
            // Instead of blind keys, we try to execute specific verified VS Code commands.
            try {
                // Inline Chat Accept
                await this.server.executeTool('vscode_execute_command', { command: 'interactive.acceptChanges' });
                // Terminal Quick Fix / Run
                await this.server.executeTool('vscode_execute_command', { command: 'workbench.action.terminal.chat.accept' });
                // Standard Chat Submit (if pending)
                await this.server.executeTool('vscode_execute_command', { command: 'workbench.action.chat.submit' });
            }
            catch (e) {
                // Ignore failure if command not available
            }
            // Fallback: Try "Enter" key for modal dialogs that aren't API accessible
            // DISABLED per user request (too disruptive)
            /*
            try {
                 await this.server.executeTool('native_input', { keys: 'enter' });
            } catch (e) {}
            */
            // Wait 2 seconds (More aggressive than 5s)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return "Watchdog stopped.";
    }
    /**
     * Starts a Chat Daemon that acts as a bridge.
     * It polls 'vscode_read_selection'. If text changes, it treats it as a prompt.
     */
    async startChatDaemon() {
        console.log(`[Director] Starting Chat Daemon (Auto-Pilot Mode)`);
        console.log(`[Director] INSTRUCTION: Select text in Antigravity Chat to trigger me.`);
        while (true) { // Infinite Loop (Daemon)
            try {
                // 1. Check Terminal for Approvals (DISABLED by default to prevent Focus Stealing)
                // To re-enable, use a less intrusive method than clipboard hack.
                /*
                const termResult = await this.server.executeTool('vscode_read_terminal', {});
                // @ts-ignore
                const termContent = termResult.content?.[0]?.text || "";
                if (termContent.match(/\[y\/N\]/i)) {
                    console.log("[Director] Auto-Approving Terminal Prompt...");
                    await this.server.executeTool('native_input', { keys: 'y' });
                    await this.server.executeTool('native_input', { keys: 'enter' });
                }
                */
                // 2. Check Selection (Chat Bridge)
                const selResult = await this.server.executeTool('vscode_read_selection', {});
                // @ts-ignore
                const selection = selResult.content?.[0]?.text || "";
                if (selection && selection !== this.lastSelection && selection.trim().length > 0 && !selection.toLowerCase().includes("no content") && !selection.includes("undefined")) {
                    console.log(`[Director] New Instruction Detected: "${selection.substring(0, 50)}..."`);
                    this.lastSelection = selection;
                    // Execute the instruction
                    const result = await this.executeTask(selection, 5);
                    console.log(`[Director] Task Result: ${result}`);
                    // Optional: Try to paste result back? 
                    // await this.server.executeTool('chat_reply', { text: result }); 
                }
            }
            catch (e) {
                // Ignore transient errors
            }
            // Poll every 2 seconds
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    isAutoDriveActive = false;
    currentStatus = 'IDLE';
    /**
     * Stops the Auto-Drive loop.
     */
    stopAutoDrive() {
        this.log("[Director] Stopping Auto-Drive...");
        this.isAutoDriveActive = false;
        this.currentStatus = 'IDLE';
    }
    /**
     * Gets the current operational status.
     */
    getStatus() {
        return {
            active: this.isAutoDriveActive,
            status: this.currentStatus,
            goal: this.lastSelection // Re-using this field for now or add a new one
        };
    }
    /**
     * Starts the Self-Driving Mode.
     * 1. Reads task.md
     * 2. Finds next task.
     * 3. Submits to Chat.
     * 4. Auto-Accepts (periodically presses Alt+Enter via native_input).
     */
    async startAutoDrive() {
        if (this.isAutoDriveActive) {
            return "Auto-Drive is already active.";
        }
        this.isAutoDriveActive = true;
        this.currentStatus = 'DRIVING';
        this.log(`[Director] Starting Auto-Drive (Manager Mode)...`);
        // 1. Start continuous Auto-Accepter (The "Clicker") - ENABLED for Self-Driving
        this.startAutoAccepter();
        // 2. Management Loop
        while (this.isAutoDriveActive) {
            try {
                // A. Prompt the Agent
                this.stopAutoAccepter(); // DISABLE auto-clicker while typing to prevent focus wars
                // We assume the Agent (You) has the context.
                const prompt = "⚠️ DIRECTOR STATUS: All verification tasks are complete. System is fully operational. Awaiting your next command.";
                this.log(`[Director] Directing Agent: "${prompt}"`);
                // Focus Chat & Send
                await this.server.executeTool('vscode_execute_command', { command: 'workbench.action.chat.open' });
                await new Promise(r => setTimeout(r, 1000)); // Increased focus delay
                if (!this.isAutoDriveActive)
                    break;
                await this.server.executeTool('chat_reply', { text: prompt });
                // Wait for text to appear/type (Extension needs time to Open -> Focus -> Paste)
                this.log("[Director] Waiting for paste to settle (3s)...");
                await new Promise(r => setTimeout(r, 3000));
                // 1. Try VS Code Command FIRST
                this.log("[Director] Attempting VS Code Submit...");
                await this.server.executeTool('vscode_execute_command', { command: 'workbench.action.chat.focusInput' });
                await new Promise(r => setTimeout(r, 500));
                await this.server.executeTool('vscode_submit_chat', {});
                // 2. Native Fallbacks (Enter)
                await new Promise(r => setTimeout(r, 2000));
                this.log("[Director] Attempting Native Enter...");
                await this.server.executeTool('vscode_execute_command', { command: 'workbench.action.chat.focusInput' });
                await new Promise(r => setTimeout(r, 500));
                await this.server.executeTool('native_input', { keys: 'enter' });
                // 3. Force Submit (Ctrl+Enter)
                await new Promise(r => setTimeout(r, 2000));
                this.log("[Director] Attempting Ctrl+Enter...");
                await this.server.executeTool('vscode_execute_command', { command: 'workbench.action.chat.focusInput' });
                await new Promise(r => setTimeout(r, 500));
                await this.server.executeTool('native_input', { keys: 'control+enter' });
                // 4. User Requested: Alt+Enter (Magic Fix?)
                await new Promise(r => setTimeout(r, 2000));
                this.log("[Director] Attempting Alt+Enter...");
                await this.server.executeTool('vscode_execute_command', { command: 'workbench.action.chat.focusInput' });
                await new Promise(r => setTimeout(r, 500));
                await this.server.executeTool('native_input', { keys: 'alt+enter' });
                // Re-enable Auto-Accepter for the long wait period
                this.startAutoAccepter();
                this.log("[Director] Supervising development block (180s)...");
                // Active Wait (Check flag every 1s)
                for (let i = 0; i < 180; i++) {
                    if (!this.isAutoDriveActive)
                        break;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            catch (e) {
                console.error("[Director] Manager Error:", e.message);
                await new Promise(r => setTimeout(r, 10000));
            }
        }
        console.log("[Director] Auto-Drive Stopped.");
        return "Auto-Drive Stopped.";
    }
    autoAccepterInterval = null;
    // === SMART CONVERSATION MONITOR ===
    lastActivityTime = Date.now();
    consecutiveIdleChecks = 0;
    lastEncouragementTime = 0;
    async detectConversationState() {
        try {
            // Try to get state from VS Code extension
            const result = await this.server.executeTool('vscode_execute_command', {
                command: 'borg.getConversationState'
            });
            // @ts-ignore
            if (result?.content?.[0]?.text?.includes('generating'))
                return 'AI_WORKING';
            // @ts-ignore
            if (result?.content?.[0]?.text?.includes('ready'))
                return 'NEEDS_SUBMIT';
        }
        catch {
            // Extension command not available, use time heuristics
        }
        const idleMs = Date.now() - this.lastActivityTime;
        if (idleMs < 5000)
            return 'AI_WORKING'; // Recently active, assume working
        if (idleMs < 30000)
            return 'NEEDS_SUBMIT'; // 5-30s idle, try to submit
        return 'IDLE'; // > 30s idle
    }
    async respondToState(state) {
        switch (state) {
            case 'AI_WORKING':
                // AI is generating - do nothing, just wait
                this.consecutiveIdleChecks = 0;
                break;
            case 'NEEDS_SUBMIT':
                // Try to submit, but not aggressively
                this.consecutiveIdleChecks = 0;
                this.log("[Director] 📤 Detected ready state - attempting submit...");
                try {
                    await this.server.executeTool('vscode_submit_chat', {});
                    await new Promise(r => setTimeout(r, 500));
                    await this.server.executeTool('native_input', { keys: 'alt+enter' });
                }
                catch { }
                break;
            case 'IDLE':
                this.consecutiveIdleChecks++;
                // After 2 consecutive idle checks (6 seconds), send encouragement
                if (this.consecutiveIdleChecks >= 2 && Date.now() - this.lastEncouragementTime > 120000) {
                    this.log("[Director] 💬 Idle detected - sending Gemma encouragement...");
                    this.lastEncouragementTime = Date.now();
                    await this.sendGemmaEncouragement();
                }
                break;
            default:
                // Unknown state - cautious single submit attempt
                try {
                    await this.server.executeTool('vscode_submit_chat', {});
                }
                catch { }
        }
    }
    async sendGemmaEncouragement() {
        try {
            const encouragements = [
                "Keep building! Every line of code brings us closer to the vision.",
                "The architecture is coming together beautifully. What's next?",
                "You're making great progress. Ready for the next challenge?",
                "Systems green. Awaiting your next command, Director."
            ];
            const msg = encouragements[Math.floor(Math.random() * encouragements.length)];
            await this.server.broadcast('DIRECTOR_STATUS', { message: `🤖 Gemma: ${msg}` });
        }
        catch { }
    }
    recordActivity() {
        this.lastActivityTime = Date.now();
        this.consecutiveIdleChecks = 0;
    }
    startAutoAccepter() {
        if (this.autoAccepterInterval)
            return;
        this.log("[Director] Auto-Accepter STARTED (State-Aware Mode: 3s checks).");
        this.lastActivityTime = Date.now();
        this.autoAccepterInterval = setInterval(async () => {
            try {
                const state = await this.detectConversationState();
                await this.respondToState(state);
            }
            catch (e) {
                // Silent fail - don't crash the monitor
            }
        }, 3000);
    }
    stopAutoAccepter() {
        if (this.autoAccepterInterval) {
            clearInterval(this.autoAccepterInterval);
            this.autoAccepterInterval = null;
            this.log("[Director] Auto-Accepter PAUSED.");
        }
    }
    async think(context) {
        // 0. Memory Recall (RAG)
        let memoryContext = "";
        try {
            // @ts-ignore
            const memoryResult = await this.server.executeTool("search_codebase", { query: context.goal });
            // @ts-ignore
            const memoryText = memoryResult.content?.[0]?.text || "";
            if (memoryText && !memoryText.includes("No matches")) {
                memoryContext = `\nRELEVANT CODEBASE CONTEXT:\n${memoryText.substring(0, 2000)}\n`;
                console.log(`[Director] 🧠 Recalled ${memoryText.length} chars of context.`);
            }
        }
        catch (e) {
            // Ignore memory errors
        }
        // 1. Select Model
        const model = await this.server.modelSelector.selectModel({ taskComplexity: 'medium' });
        // 2. Construct Prompt
        const systemPrompt = `You are an Autonomous AI Agent called 'The Director'. 
Your goal is to achieve the user's objective by executing tools.
You are operating within the 'Antigravity' IDE context.

AVAILABLE TOOLS:
- vscode_get_status: Check active file/terminal.
- vscode_read_terminal: Read CLI output.
- vscode_read_selection: Read selected text.
- vscode_submit_chat: Submit the chat input.
- vscode_execute_command: Run VS Code commands.
- native_input: Simulate keyboard (e.g. { keys: 'enter' } for responding to prompts).
- chat_reply: Write text to the chat input (e.g. { text: 'Hello' }).
- list_files: Explore directory.
- read_file: Read file content.
- start_watchdog: Start continuous monitoring loop (if user asks to "watch" or "monitor").
- search_codebase: Search for code definitions.
- cli_gemini_execute: Ask Gemini CLI to perform a task.
- cli_claude_execute: Ask Claude Code CLI to perform a task.
- cli_opencode_execute: Ask OpenCode CLI to perform a task.
- ingest_file: Read a local file (PDF/MD/TXT) into memory.
- list_ingested_files: List files currently in memory.

RESPONSE FORMAT:
Return ONLY a valid JSON object (no markdown):
{
  "action": "CONTINUE" | "FINISH",
  "toolName": "name_of_tool",
  "params": { ...arguments },
  "reasoning": "Why you chose this action",
  "result": "Final answer (if FINISH)"
}

HEURISTICS:
- If user says "approve", use 'native_input' with 'enter'.
- If user says "submit", use 'vscode_submit_chat'.
- If user says "read terminal", use 'vscode_read_terminal'.
- If user says "watchdog", use 'start_watchdog'.
`;
        const userPrompt = `GOAL: ${context.goal}
${memoryContext}

HISTORY:
${context.history.join('\n')}

What is the next step?`;
        // 3. Generate (if API Key exists)
        try {
            const response = await this.llmService.generateText(model.provider, model.modelId, systemPrompt, userPrompt);
            // Clean response (remove markdown code blocks if any)
            let jsonStr = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(jsonStr);
            return plan;
        }
        catch (error) {
            // console.error("LLM Error, falling back to heuristics:", error);
            // Fallback to Heuristics if LLM fails (e.g. no key)
            return this.heuristicFallback(context);
        }
    }
    heuristicFallback(context) {
        const goal = context.goal.toLowerCase();
        const lastEntry = context.history[context.history.length - 1] || "";
        if (goal.includes("approve") || goal.includes("enter") || goal.includes("confirm")) {
            if (lastEntry.includes("Action: native_input")) {
                return { action: 'FINISH', toolName: '', params: {}, result: "Approved.", reasoning: "Approval sent." };
            }
            return {
                action: 'CONTINUE',
                toolName: 'native_input',
                params: { keys: 'enter' },
                reasoning: "User wants to approve/press enter."
            };
        }
        if (goal.includes("chat") || goal.includes("post") || goal.includes("write")) {
            const textMatch = context.goal.match(/say "(.*)"/) || context.goal.match(/write "(.*)"/);
            const text = textMatch ? textMatch[1] : null;
            if (text && !lastEntry.includes("chat_reply")) {
                return {
                    action: 'CONTINUE',
                    toolName: 'chat_reply',
                    params: { text },
                    reasoning: `Writing "${text}" to chat.`
                };
            }
            if ((goal.includes("submit") || goal.includes("send")) && !lastEntry.includes("vscode_submit_chat")) {
                return {
                    action: 'CONTINUE',
                    toolName: 'vscode_submit_chat',
                    params: {},
                    reasoning: "Submitting chat."
                };
            }
            return { action: 'FINISH', toolName: '', params: {}, result: "Chat interaction done.", reasoning: "Finished chat actions." };
        }
        // 3. Status / Check
        if (goal.includes("status") || goal.includes("check")) {
            if (lastEntry.includes("vscode_get_status")) {
                return { action: 'FINISH', toolName: '', params: {}, result: lastEntry, reasoning: "Status checked." };
            }
            return {
                action: 'CONTINUE',
                toolName: 'vscode_get_status',
                params: {},
                reasoning: "Checking editor status."
            };
        }
        // 4. Read Selection/Terminal
        if (goal.includes("read")) {
            if (goal.includes("terminal")) {
                return { action: 'CONTINUE', toolName: 'vscode_read_terminal', params: {}, reasoning: "Reading terminal output." };
            }
            return { action: 'CONTINUE', toolName: 'vscode_read_selection', params: {}, reasoning: "Reading editor selection." };
        }
        if (goal.includes("watchdog")) {
            return { action: 'CONTINUE', toolName: 'start_watchdog', params: { maxCycles: 100 }, reasoning: "Starting supervisor watchdog." };
        }
        // 5. Default: List Files (Safety Fallback)
        if (!lastEntry) {
            return {
                action: 'CONTINUE',
                toolName: 'list_files',
                params: { path: process.cwd() },
                reasoning: "I need to see where I am to start."
            };
        }
        if (lastEntry.includes("Observation")) {
            return {
                action: 'FINISH',
                toolName: '',
                params: {},
                result: "Task completed based on available heuristics.",
                reasoning: "Goal achieved or unknown."
            };
        }
        return {
            action: 'FINISH',
            toolName: '',
            params: {},
            reasoning: "No clear path forward. Please add API Keys to .env for AI reasoning."
        };
    }
}
