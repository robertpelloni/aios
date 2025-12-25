import { SecretManager } from '../managers/SecretManager.js';

export interface CompletionRequest {
    system?: string;
    messages: any[];
    tools?: any[];
    maxTokens?: number;
}

export interface CompletionResponse {
    content: string;
    toolCalls?: any[];
}

export type ModelProvider = 'openai' | 'anthropic' | 'ollama';

export interface UsageStats {
    tokensIn: number;
    tokensOut: number;
    cost: number;
    requests: number;
}

export class ModelGateway {
    private provider: ModelProvider = 'openai';
    private model: string = 'gpt-4o'; // Default

    public stats: UsageStats = {
        tokensIn: 0,
        tokensOut: 0,
        cost: 0,
        requests: 0
    };

    constructor(private secretManager: SecretManager) {}

    setProvider(provider: ModelProvider, model: string) {
        this.provider = provider;
        this.model = model;
        console.log(`[ModelGateway] Switched to ${provider}:${model}`);
    }

    private trackUsage(inputLen: number, outputLen: number, model: string) {
        // Rough estimation: 1 token ~= 4 chars
        const tokensIn = Math.ceil(inputLen / 4);
        const tokensOut = Math.ceil(outputLen / 4);

        this.stats.tokensIn += tokensIn;
        this.stats.tokensOut += tokensOut;
        this.stats.requests++;

        // Rough Cost Estimation (based on GPT-4o tiers)
        // Input: $5.00 / 1M tokens
        // Output: $15.00 / 1M tokens
        const costIn = (tokensIn / 1_000_000) * 5.00;
        const costOut = (tokensOut / 1_000_000) * 15.00;

        this.stats.cost += (costIn + costOut);
    }

    async getEmbedding(text: string): Promise<number[] | null> {
        if (this.provider === 'openai' || this.secretManager.getSecret('OPENAI_API_KEY')) {
            try {
                const apiKey = this.secretManager.getSecret('OPENAI_API_KEY');
                if (!apiKey) return null;

                const OpenAIApi = await import('openai');
                const openai = new OpenAIApi.OpenAI({ apiKey });

                const response = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: text,
                });

                // Track embedding cost ($0.02 / 1M tokens)
                const tokens = Math.ceil(text.length / 4);
                this.stats.tokensIn += tokens;
                this.stats.cost += (tokens / 1_000_000) * 0.02;

                return response.data[0].embedding;
            } catch (e) {
                console.warn('[ModelGateway] Embedding failed:', e);
                return null;
            }
        }
        return null;
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        let response: CompletionResponse;

        // Calculate input size roughly for tracking
        const inputStr = JSON.stringify(request.messages) + (request.system || '');

        if (this.provider === 'openai') {
            response = await this.callOpenAI(request);
        } else if (this.provider === 'anthropic') {
            response = await this.callAnthropic(request);
        } else if (this.provider === 'ollama') {
            response = await this.callOllama(request);
        } else {
            throw new Error(`Unknown provider: ${this.provider}`);
        }

        // Track usage
        this.trackUsage(inputStr.length, response.content.length, this.model);

        return response;
    }

    private async callOpenAI(req: CompletionRequest): Promise<CompletionResponse> {
        const apiKey = this.secretManager.getSecret('OPENAI_API_KEY');
        if (!apiKey) throw new Error("OPENAI_API_KEY not found");

        const OpenAIApi = await import('openai');
        const openai = new OpenAIApi.OpenAI({ apiKey });

        const messages = [];
        if (req.system) messages.push({ role: 'system', content: req.system });
        messages.push(...req.messages);

        const completion = await openai.chat.completions.create({
            model: this.model,
            messages: messages as any,
            tools: req.tools,
            max_tokens: req.maxTokens || 1024
        });

        const choice = completion.choices[0];
        return {
            content: choice.message.content || '',
            toolCalls: choice.message.tool_calls
        };
    }

    private async callAnthropic(req: CompletionRequest): Promise<CompletionResponse> {
         const apiKey = this.secretManager.getSecret('ANTHROPIC_API_KEY');
         if (!apiKey) throw new Error("ANTHROPIC_API_KEY not found");

         const response = await fetch('https://api.anthropic.com/v1/messages', {
             method: 'POST',
             headers: {
                 'x-api-key': apiKey,
                 'anthropic-version': '2023-06-01',
                 'content-type': 'application/json'
             },
             body: JSON.stringify({
                 model: this.model || 'claude-3-opus-20240229',
                 max_tokens: req.maxTokens || 1024,
                 system: req.system,
                 messages: req.messages.map(m => ({
                     role: m.role,
                     content: m.content
                 }))
             })
         });

         if (!response.ok) {
             const err = await response.text();
             throw new Error(`Anthropic API Error: ${err}`);
         }

         const data = await response.json() as any;
         return {
             content: data.content[0].text
         };
    }

    private async callOllama(req: CompletionRequest): Promise<CompletionResponse> {
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    ...(req.system ? [{ role: 'system', content: req.system }] : []),
                    ...req.messages
                ],
                stream: false
            })
        });

        if (!response.ok) throw new Error(`Ollama failed: ${response.statusText}`);
        const data = await response.json() as any;

        return {
            content: data.message.content
        };
    }
}
