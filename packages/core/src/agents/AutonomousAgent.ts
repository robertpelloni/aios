import { EventEmitter } from 'events';
import { AgentDefinition } from '../types.js';
import { AgentMessageBroker } from '../managers/AgentMessageBroker.js';
import { McpRouter } from '../managers/McpRouter.js';
import { LogManager } from '../managers/LogManager.js';
import OpenAI from 'openai';

export interface ReflectionResult {
    wasSuccessful: boolean;
    reasoning: string;
    improvements: string[];
    shouldRetry: boolean;
    adjustedApproach?: string;
}

export class AutonomousAgent extends EventEmitter {
    private status: 'idle' | 'busy' | 'paused' = 'idle';
    private loopInterval: NodeJS.Timeout | null = null;
    private messages: any[] = [];
    private openai: OpenAI | null = null;
    private sessionId: string;
    private reflectionEnabled: boolean = true;
    private reflectionHistory: ReflectionResult[] = [];

    constructor(
        public readonly id: string,
        public readonly definition: AgentDefinition,
        private messageBroker: AgentMessageBroker,
        private mcpRouter: McpRouter,
        private logManager: LogManager,
        private apiKey: string,
        private parentId?: string
    ) {
        super();
        this.sessionId = `auto-agent-${this.id}-${Date.now()}`;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        }
        
        // Initialize System Prompt
        let systemPrompt = `You are ${definition.name}. ${definition.description}\n\nInstructions:\n${definition.instructions}\n\nYou are an autonomous agent. You can receive messages from other agents or the user. Check your mailbox frequently.`;
        
        if (this.parentId) {
            systemPrompt += `\n\nYou are a sub-agent delegated by agent "${this.parentId}". Report your findings back to them using the 'send_message' tool.`;
        }

        this.messages.push({
            role: 'system',
            content: systemPrompt
        });
    }

    public async start() {
        if (this.status !== 'paused' && this.status !== 'idle') return;
        this.status = 'idle';
        console.log(`[AutonomousAgent:${this.definition.name}] Starting loop...`);
        
        // Subscribe to real-time messages
        this.messageBroker.subscribe(this.id, (msg) => {
            console.log(`[AutonomousAgent:${this.definition.name}] Real-time message received from ${msg.sourceAgentId}`);
            this.handleMessage(msg);
        });

        // Start Tick Loop for background tasks (like checking mailbox if subscription fails, or internal thoughts)
        this.loopInterval = setInterval(() => this.tick(), 5000); // Check every 5s
    }

    public stop() {
        this.status = 'paused';
        if (this.loopInterval) clearInterval(this.loopInterval);
        this.messageBroker.unsubscribe(this.id);
        console.log(`[AutonomousAgent:${this.definition.name}] Stopped.`);
    }

    private async tick() {
        if (this.status === 'busy') return;

        // 1. Check Mailbox (Redundant if subscription works, but good backup)
        const messages = this.messageBroker.getMessages(this.id);
        if (messages.length > 0) {
            console.log(`[AutonomousAgent:${this.definition.name}] Found ${messages.length} messages in mailbox.`);
            for (const msg of messages) {
                await this.handleMessage(msg);
            }
        }
    }

    private async handleMessage(msg: any) {
        this.status = 'busy';
        try {
            // Add to memory
            this.messages.push({
                role: 'user',
                content: `Message from ${msg.sourceAgentId}: ${JSON.stringify(msg.content)}`
            });

            // Trigger Thought/Action Loop
            await this.runCycle();

        } catch (err) {
            console.error(`[AutonomousAgent:${this.definition.name}] Error handling message:`, err);
        } finally {
            this.status = 'idle';
        }
    }

    private async runCycle() {
        if (!this.openai) {
            console.error(`[AutonomousAgent:${this.definition.name}] No OpenAI Key.`);
            return;
        }

        let iterations = 0;
        const maxIterations = 5; // Limit autonomous steps per trigger

        while (iterations < maxIterations) {
            iterations++;
            
            // 1. Get Tools
            const tools = await this.mcpRouter.getAllTools(this.sessionId);
            const openAiTools = tools.map((t: any) => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema || {}
                }
            }));

            // 2. Call LLM
            const completion = await this.openai.chat.completions.create({
                model: this.definition.model || 'gpt-4-turbo',
                messages: this.messages,
                tools: openAiTools as any,
                tool_choice: 'auto'
            });

            // Log Cost
            if (this.logManager && completion.usage) {
                const cost = this.logManager.calculateCost(
                    this.definition.model || 'gpt-4-turbo', 
                    completion.usage.prompt_tokens, 
                    completion.usage.completion_tokens
                );
                this.logManager.log({
                    type: 'response',
                    tool: 'llm_completion',
                    server: 'openai',
                    args: { agent: this.definition.name },
                    result: { usage: completion.usage },
                    tokens: completion.usage.total_tokens,
                    cost: cost
                });
            }

            const message = completion.choices[0].message;
            this.messages.push(message);

            // 3. Handle Tool Calls
            if (message.tool_calls && message.tool_calls.length > 0) {
                for (const toolCall of message.tool_calls) {
                    // @ts-ignore
                    const name = toolCall.function.name;
                    // @ts-ignore
                    const args = JSON.parse(toolCall.function.arguments);

                    console.log(`[AutonomousAgent:${this.definition.name}] Executing ${name}`);
                    
                    let result;
                    try {
                        const res = await this.mcpRouter.callToolSimple(name, args, this.sessionId);
                        result = JSON.stringify(res);
                    } catch (e: any) {
                        result = `Error: ${e.message}`;
                    }

                    this.messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: result
                    });
                }
                // Loop continues to let LLM process the tool output
            } else {
                // 4. Final Answer / Stop
                console.log(`[AutonomousAgent:${this.definition.name}] Cycle complete. Response: ${message.content}`);
                
                // 5. Auto-Reflection (if enabled)
                if (this.reflectionEnabled && message.content) {
                    const reflection = await this.reflect(message.content);
                    this.reflectionHistory.push(reflection);
                    
                    if (reflection.shouldRetry && reflection.adjustedApproach) {
                        console.log(`[AutonomousAgent:${this.definition.name}] Reflection suggests retry: ${reflection.reasoning}`);
                        // Add reflection as context for retry
                        this.messages.push({
                            role: 'user',
                            content: `[Self-Reflection] Your previous response may need improvement.\n\nAnalysis: ${reflection.reasoning}\n\nSuggested improvements:\n${reflection.improvements.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nPlease try again with this adjusted approach: ${reflection.adjustedApproach}`
                        });
                        // Continue loop for one more iteration
                        continue;
                    }
                }
                break;
            }
        }
    }

    /**
     * Self-reflection mechanism - analyzes the agent's output and determines if improvement is needed
     */
    private async reflect(output: string): Promise<ReflectionResult> {
        if (!this.openai) {
            return { wasSuccessful: true, reasoning: 'No OpenAI key for reflection', improvements: [], shouldRetry: false };
        }

        const reflectionPrompt = `You are a self-reflection module for an AI agent. Analyze the following agent output and evaluate its quality.

Agent Name: ${this.definition.name}
Agent Purpose: ${this.definition.description}

Agent's Output:
"""
${output.substring(0, 4000)}
"""

Recent reflection history (last 3):
${this.reflectionHistory.slice(-3).map(r => `- ${r.wasSuccessful ? 'SUCCESS' : 'NEEDS_IMPROVEMENT'}: ${r.reasoning}`).join('\n') || 'None'}

Evaluate:
1. Did the agent accomplish its intended task?
2. Was the response complete and accurate?
3. Are there obvious errors or omissions?
4. Could the approach be significantly improved?

Return a JSON object with:
{
  "wasSuccessful": boolean,
  "reasoning": "brief explanation",
  "improvements": ["improvement 1", "improvement 2"],
  "shouldRetry": boolean (only true if critical issues found AND this is first reflection),
  "adjustedApproach": "specific guidance for retry" (only if shouldRetry is true)
}

Be conservative with shouldRetry - only suggest retry for significant issues, not minor improvements.
Output JSON only.`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo',
                messages: [
                    { role: 'system', content: 'You are a precise evaluator. Output valid JSON only.' },
                    { role: 'user', content: reflectionPrompt }
                ],
                temperature: 0.3
            });

            const content = completion.choices[0].message.content || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]) as ReflectionResult;
                // Prevent infinite retry loops - only allow retry if we haven't retried recently
                if (result.shouldRetry && this.reflectionHistory.length > 0) {
                    const lastReflection = this.reflectionHistory[this.reflectionHistory.length - 1];
                    if (lastReflection.shouldRetry) {
                        result.shouldRetry = false; // Don't retry twice in a row
                    }
                }
                console.log(`[AutonomousAgent:${this.definition.name}] Reflection: ${result.wasSuccessful ? 'SUCCESS' : 'NEEDS_IMPROVEMENT'} - ${result.reasoning}`);
                return result;
            }
            
            return { wasSuccessful: true, reasoning: 'Could not parse reflection', improvements: [], shouldRetry: false };
        } catch (e) {
            console.error(`[AutonomousAgent:${this.definition.name}] Reflection failed:`, e);
            return { wasSuccessful: true, reasoning: 'Reflection error', improvements: [], shouldRetry: false };
        }
    }

    /**
     * Enable or disable auto-reflection
     */
    public setReflectionEnabled(enabled: boolean) {
        this.reflectionEnabled = enabled;
    }

    /**
     * Get reflection history for analysis
     */
    public getReflectionHistory(): ReflectionResult[] {
        return [...this.reflectionHistory];
    }
}
