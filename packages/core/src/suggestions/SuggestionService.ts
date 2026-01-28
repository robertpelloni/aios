
import { v4 as uuidv4 } from 'uuid';
import { LLMService } from '@borg/ai';
import fs from 'fs';
import path from 'path';

export interface Suggestion {
    id: string;
    title: string;
    description: string;
    type: 'ACTION' | 'INFO';
    source: string; // e.g., "Director", "Linter"
    payload?: any; // Tool call data or other metadata
    timestamp: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

import { Director } from '@borg/agents';

export class SuggestionService {
    private suggestions: Suggestion[] = [];
    private llmService: LLMService;
    private processingPaths = new Set<string>(); // Prevent duplicate processing
    private persistencePath: string;
    private director?: Director;

    constructor(llmService?: LLMService, director?: Director) {
        this.llmService = llmService || new LLMService();
        this.director = director;
        this.persistencePath = path.join(process.cwd(), 'packages/core/data/suggestions.json');
        this.loadSuggestions();
    }

    private loadSuggestions() {
        try {
            if (fs.existsSync(this.persistencePath)) {
                const data = fs.readFileSync(this.persistencePath, 'utf-8');
                this.suggestions = JSON.parse(data);
                console.log(`[SuggestionService] Loaded ${this.suggestions.length} suggestions.`);
            }
        } catch (e) {
            console.error("[SuggestionService] Failed to load suggestions:", e);
        }
    }

    private saveSuggestions() {
        try {
            const dir = path.dirname(this.persistencePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            // Prune old resolved items to keep file small (keep last 50)
            const active = this.suggestions.filter(s => s.status === 'PENDING');
            const history = this.suggestions.filter(s => s.status !== 'PENDING').slice(-50);

            fs.writeFileSync(this.persistencePath, JSON.stringify([...active, ...history], null, 2));
        } catch (e) {
            console.error("[SuggestionService] Failed to save suggestions:", e);
        }
    }

    /**
     * Creates a new suggestion and adds it to the queue.
     */
    addSuggestion(title: string, description: string, source: string, payload?: any): Suggestion {
        const suggestion: Suggestion = {
            id: uuidv4(),
            title,
            description,
            type: 'ACTION',
            source,
            payload,
            timestamp: Date.now(),
            status: 'PENDING'
        };
        this.suggestions.push(suggestion);
        this.saveSuggestions();
        console.log(`[SuggestionService] New Suggestion: ${title} (${source})`);

        // Conversational Nudge
        if (this.director) {
            // Fire and forget
            this.director.broadcast(`💡 **Suggestion**: I found a potential improvement: **"${title}"**.\n${description}\n*(Check Dashboard to Approve)*`);
        }

        return suggestion;
    }

    getPendingSuggestions(): Suggestion[] {
        return this.suggestions.filter(s => s.status === 'PENDING').sort((a, b) => b.timestamp - a.timestamp);
    }

    clearAll() {
        this.suggestions = [];
        this.saveSuggestions();
    }

    resolveSuggestion(id: string, status: 'APPROVED' | 'REJECTED'): Suggestion | undefined {
        const index = this.suggestions.findIndex(s => s.id === id);
        if (index !== -1) {
            this.suggestions[index].status = status;
            this.saveSuggestions(); // Save state change
            console.log(`[SuggestionService] Suggestion ${id} ${status}`);
            return this.suggestions[index];
        }
        return undefined;
    }

    /**
     * Analyzes context using LLM to generate intelligent suggestions.
     */
    async processContext(context: { type: string; path?: string; content?: string }) {
        if (!context.path || this.processingPaths.has(context.path)) return;

        // Cooldown/Debounce check
        this.processingPaths.add(context.path);
        setTimeout(() => this.processingPaths.delete(context.path!), 30000); // 30s cooldown per file

        try {
            // Keep content short to save tokens
            const snippet = context.content ? context.content.slice(0, 2000) : `(Path: ${context.path})`;

            const prompt = `
            You are an AI Pair Programmer. The user is editing: ${context.path}
            
            Code Snippet (First 2kb):
            ${snippet}
            
            Analyze this context. If you see a clear, actionable improvement (e.g., adding tests, fixing a security issue, refactoring complex code, or running a specific command), propose it.
            
            Return JSON ONLY:
            {
                "found": boolean,
                "title": "Short Title",
                "description": "Why checking this is important",
                "tool": "tool_name",
                "args": { ... }
            }
            
            If nothing important triggers, return { "found": false }.
            Do not suggest generic things like 'Add comments'. Only actionable, high-value tasks.
            `;

            // Simplified LLM call (assuming LLMService has a generateJson or similar, using generateText for now)
            // Ideally we'd use a structure-enforcing mode.
            const response = await this.llmService.generateText(prompt);
            const textContent = typeof response === 'string' ? response : ((response as any).text || "");
            const jsonStart = textContent.indexOf('{');
            const jsonEnd = textContent.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const result = JSON.parse(textContent.slice(jsonStart, jsonEnd + 1));

                if (result.found) {
                    this.addSuggestion(
                        result.title,
                        result.description,
                        "AI Copilot",
                        { tool: result.tool, args: result.args }
                    );
                }
            }
        } catch (e) {
            console.error("[SuggestionService] Analysis failed:", e);
        }
    }
}
