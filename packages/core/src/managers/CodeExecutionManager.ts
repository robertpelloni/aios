import vm from 'vm';
import { DockerService } from '../services/DockerService.js';

export class CodeExecutionManager {
    constructor(private dockerService?: DockerService) {}

    async execute(code: string, toolCallback: (name: string, args: any) => Promise<any>, runtime: 'node' | 'python' = 'node') {
        if (runtime === 'python') {
            if (!this.dockerService) {
                throw new Error("DockerService not initialized. Cannot run Python.");
            }
            return await this.dockerService.executePython(code);
        }

        // Node.js Execution (vm)
        const context = {
            console: {
                log: (...args: any[]) => console.log('[Sandbox]', ...args),
                error: (...args: any[]) => console.error('[Sandbox]', ...args)
            },
            call_tool: async (name: string, args: any) => {
                return await toolCallback(name, args);
            }
        };

        vm.createContext(context);

        // Wrap code in async IIFE to allow await
        const wrappedCode = `
            (async () => {
                try {
                    ${code}
                } catch (e) {
                    return e.message;
                }
            })();
        `;

        try {
            const result = await vm.runInContext(wrappedCode, context, { timeout: 5000 });
            return result;
        } catch (e: any) {
            return `Execution Error: ${e.message}`;
        }
    }
}
