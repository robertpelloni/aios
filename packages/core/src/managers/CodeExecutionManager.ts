import { SandboxManager } from './SandboxManager.js';

export class CodeExecutionManager {
    private sandbox: SandboxManager;

    constructor() {
        this.sandbox = new SandboxManager();
    }

    async execute(code: string, toolCallback: (name: string, args: any) => Promise<any>, sessionId?: string): Promise<string> {
        try {
            const result = await this.sandbox.execute(code, toolCallback);
            return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (e: any) {
            return `Error: ${e.message}`;
        }
    }
}
