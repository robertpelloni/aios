import { AgentAdapter, AgentConfig } from '../AgentAdapter.js';

export class GeminiAdapter extends AgentAdapter {
    constructor() {
        const config: AgentConfig = {
            name: 'Gemini CLI',
            command: 'gemini', // Assumes 'gemini' executable in PATH
            args: [],
        };
        super(config);
    }
}
