import { exec } from 'child_process';
import { AgentExecutor } from '../agents/AgentExecutor.js';

export class HookExecutor {
    constructor(private agentExecutor?: AgentExecutor) {}

    static async executeCommand(command: string, args: string[] = []): Promise<string> {
        const fullCommand = args && args.length > 0 ? `${command} ${args.join(' ')}` : command;
        return new Promise((resolve, reject) => {
            console.log(`Executing hook command: ${fullCommand}`);
            exec(fullCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Hook execution failed: ${error.message}`);
                    return reject(error);
                }
                if (stderr) {
                    console.warn(`Hook stderr: ${stderr}`);
                }
                console.log(`Hook stdout: ${stdout}`);
                resolve(stdout);
            });
        });
    }

    async executeAgent(agentName: string, task: string) {
        if (!this.agentExecutor) {
            console.warn("[HookExecutor] AgentExecutor not available.");
            return;
        }
        // Logic to run agent would go here
        console.log(`[HookExecutor] Request to run agent ${agentName}: ${task}`);
    }
}
