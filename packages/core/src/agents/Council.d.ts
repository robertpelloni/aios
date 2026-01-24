import { ModelSelector } from "../ModelSelector.js";
export interface DebateResult {
    approved: boolean;
    transcripts: {
        speaker: string;
        text: string;
    }[];
    summary: string;
}
export declare class Council {
    private modelSelector;
    private members;
    private llmService;
    constructor(modelSelector: ModelSelector);
    startDebate(proposal: string): Promise<DebateResult>;
    /**
     * The Judge synthesizes all council opinions into a final verdict.
     */
    private synthesizeDecision;
    private consultMember;
}
//# sourceMappingURL=Council.d.ts.map