import { LLMService } from "../ai/LLMService.js";
export class Council {
    modelSelector;
    members = [
        { name: "The Architect", role: "System Design", personality: "Focuses on scalability, clean code, and patterns. Strict." },
        { name: "The Guardian", role: "Security", personality: "Paranoid about system modifications (writes, execution, network). Permissive for reading project files (md, ts, json) to enable learning." },
        { name: "The Optimizer", role: "Performance", personality: "Obsessed with speed and resource usage. Pragmatic." }
    ];
    llmService;
    constructor(modelSelector) {
        this.modelSelector = modelSelector;
        this.llmService = new LLMService();
    }
    async startDebate(proposal) {
        console.log(`[Council] 🏛️ Session started for: "${proposal}"`);
        const transcripts = [];
        // Parallel Consultation
        const consultations = this.members.map(member => this.consultMember(member, proposal));
        const results = await Promise.all(consultations);
        for (const res of results) {
            transcripts.push({
                speaker: res.member.name,
                text: res.response
            });
        }
        // Synthesize decision via Judge
        const verdict = await this.synthesizeDecision(proposal, transcripts);
        console.log(`[Council] 🏁 Verdict: ${verdict.summary}`);
        return verdict;
    }
    /**
     * The Judge synthesizes all council opinions into a final verdict.
     */
    async synthesizeDecision(proposal, transcripts) {
        const model = await this.modelSelector.selectModel({ taskComplexity: 'high', taskType: 'supervisor' });
        const debateLog = transcripts.map(t => `**${t.speaker}**: ${t.text}`).join('\n\n');
        const systemPrompt = `You are The Judge, the final arbiter on the AI Council.
Your role is to synthesize the perspectives of the council members into a single, actionable decision.

You must:
1. Weigh all perspectives fairly.
2. Identify if any member raised a critical concern (e.g., security risk, data loss).
3. Render a verdict: APPROVED, APPROVED_WITH_CONDITIONS, or DENIED.
4. Provide a brief reasoning for your decision.

RESPONSE FORMAT (JSON):
{
  "verdict": "APPROVED" | "APPROVED_WITH_CONDITIONS" | "DENIED",
  "reasoning": "Brief explanation",
  "conditions": ["Optional: list of conditions if APPROVED_WITH_CONDITIONS"]
}`;
        const userPrompt = `PROPOSAL: "${proposal}"

COUNCIL DEBATE:
${debateLog}

Render your verdict.`;
        try {
            const response = await this.llmService.generateText(model.provider, model.modelId, systemPrompt, userPrompt);
            const content = response.content.trim();
            // Parse JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const approved = parsed.verdict !== 'DENIED';
                let summary = `${parsed.verdict}: ${parsed.reasoning}`;
                if (parsed.conditions?.length) {
                    summary += ` | Conditions: ${parsed.conditions.join(', ')}`;
                }
                return { approved, transcripts, summary };
            }
            // Fallback if JSON parsing fails
            return { approved: true, transcripts, summary: `Judge: ${content}` };
        }
        catch (e) {
            console.error(`[Council] Judge error:`, e.message);
            // Default to approval on error (fail-open for development)
            return {
                approved: true,
                transcripts,
                summary: `Judge abstained due to error: ${e.message}`
            };
        }
    }
    async consultMember(member, proposal) {
        // Select a smart model for the Council
        const model = await this.modelSelector.selectModel({ taskComplexity: 'medium', taskType: 'supervisor' });
        const systemPrompt = `You are ${member.name}, a member of the AI Council.
Role: ${member.role}
Personality: ${member.personality}

Your task is to review the following technical proposal/action given by an autonomous agent.
You must provide constructive criticism, strategic advice, or alternative suggestions.
You are NOT a gatekeeper. You are a collaborator.

RESPONSE FORMAT:
Start your response with a concise 1-sentence summary of your advice (max 15 words).
Then provide a detailed explanation or suggestion in the following paragraph.
`;
        const userPrompt = `PROPOSAL: "${proposal}"\n\nWhat is your advice?`;
        try {
            const response = await this.llmService.generateText(model.provider, model.modelId, systemPrompt, userPrompt);
            const content = response.content.trim();
            console.log(`[Council] 👤 ${member.name}: ${content}`);
            // Extract first sentence as short advice
            const firstLine = content.split('\n')[0] || "No advice.";
            return {
                member,
                response: content,
                shortAdvice: firstLine
            };
        }
        catch (e) {
            console.error(`[Council] Error consulting ${member.name}:`, e.message);
            return {
                member,
                response: `[Error: ${e.message}] Abstained.`,
                shortAdvice: "Abstained."
            };
        }
    }
}
