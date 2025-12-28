import { SandboxManager } from './SandboxManager.js';

export class CodeExecutionManager {
    // We create a new sandbox for each execution to ensure isolation
    // private sandbox: SandboxManager; 

    constructor() {
        // this.sandbox = new SandboxManager();
    }

    async execute(code: string, toolCallback: (name: string, args: any) => Promise<any>, sessionId?: string): Promise<string> {
        const sandbox = new SandboxManager();
        try {
            const result = await sandbox.execute(code, toolCallback);
            return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (e: any) {
            return `Error: ${e.message}`;
        } finally {
            sandbox.dispose();
        }
    }
}
