import { ModelSelector } from "../ModelSelector.js";

interface CouncilMember {
    name: string;
    role: string;
    personality: string;
}

interface DebateResult {
    approved: boolean;
    transcripts: { speaker: string, text: string }[];
    summary: string;
}

export class Council {
    private members: CouncilMember[] = [
        { name: "The Architect", role: "System Design", personality: "Focuses on scalability, clean code, and patterns. Strict." },
        { name: "The Guardian", role: "Security", personality: "Paranoid about permissions, file access, and safety. Conservative." },
        { name: "The Optimizer", role: "Performance", personality: "Obsessed with speed and resource usage. Pragmatic." }
    ];

    constructor(private modelSelector: ModelSelector) { }

    async startDebate(proposal: string): Promise<DebateResult> {
        console.log(`[Council] Session started for: "${proposal}"`);
        const transcripts: { speaker: string, text: string }[] = [];
        let votesFor = 0;
        let votesAgainst = 0;

        // Parallel Consultation
        const consultations = this.members.map(member => this.consultMember(member, proposal));
        const results = await Promise.all(consultations);

        for (const res of results) {
            transcripts.push({
                speaker: res.member.name,
                text: res.response
            });

            if (res.approved) votesFor++;
            else votesAgainst++;
        }

        // Decision Logic
        const approved = votesFor > votesAgainst; // Simple majority? Or Guardian Veto?

        // Guardian Veto Override: If Guardian says NO, it's NO.
        const guardianResult = results.find(r => r.member.name === "The Guardian");
        const finalDecision = (guardianResult && !guardianResult.approved) ? false : approved;

        const summary = `Council Decision: ${finalDecision ? 'APPROVED' : 'DENIED'} (Votes: ${votesFor}-${votesAgainst}). ` +
            (finalDecision !== approved ? "Guardian Veto applied." : "");

        return {
            approved: finalDecision,
            transcripts,
            summary
        };
    }

    private async consultMember(member: CouncilMember, proposal: string): Promise<{ member: CouncilMember, response: string, approved: boolean }> {
        // Select a smart model for the Council
        const model = await this.modelSelector.selectModel({ taskComplexity: 'medium', taskType: 'supervisor' });

        const systemPrompt = `You are ${member.name}, a member of the AI Council.
Role: ${member.role}
Personality: ${member.personality}

Your task is to review the following technical proposal/action given by an autonomous agent.
You must vote YES (Approve) or NO (Deny) and provide a short critique.

RESPONSE FORMAT:
Start your response with "VOTE: YES" or "VOTE: NO", followed by a newline, then your reasoning.
Keep your reasoning concise (max 2 sentences).
`;

        const userPrompt = `PROPOSAL: "${proposal}"\n\nWhat is your vote?`;

        // Add specific heuristics/inject context if needed
        // e.g. "The user is in a hurry"

        try {
            // Need to instantiate LLMService. 
            // Since Council is initialized with ModelSelector, we assume we can get an LLMService instance or it should be passed in.
            // Looking at the file, Council doesn't have LLMService. modifying constructor in next step.
            // For now, I will assume a global or I need to update the Class structure.
            // Let's assume I will fix the constructor dependency in a moment.

            // Temporary hack: Just use a singleton or new LLMService(). 
            // Ideally it should be injected.
            const { LLMService } = await import('../ai/LLMService.js');
            const llm = new LLMService();

            const response = await llm.generateText(model.provider, model.modelId, systemPrompt, userPrompt);
            const content = response.content.trim();

            const voteYes = content.includes("VOTE: YES");
            const cleanText = content.replace(/VOTE: (YES|NO)/i, '').trim();

            return {
                member,
                response: cleanText,
                approved: voteYes
            };

        } catch (e: any) {
            console.error(`[Council] Error consulting ${member.name}:`, e.message);
            // Fallback: Default to abstain/approve if error? Or fail safe?
            // Fail safe: Guardian -> No, Others -> Yes
            return {
                member,
                response: `[Error: ${e.message}] Abstained.`,
                approved: member.name !== "The Guardian"
            };
        }
    }
}
