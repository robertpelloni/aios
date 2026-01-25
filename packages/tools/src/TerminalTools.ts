import { spawn } from "child_process";
import { ProcessRegistry } from "./os/ProcessRegistry.js";

export class TerminalService {
    constructor(private registry: ProcessRegistry) { }

    getTools() {
        return [
            {
                name: "execute_command",
                description: "Execute a shell command",
                inputSchema: {
                    type: "object",
                    properties: {
                        command: { type: "string", description: "Command to execute" },
                        cwd: { type: "string", description: "Working directory (optional)" }
                    },
                    required: ["command"]
                },
                handler: async (args: { command: string, cwd?: string }) => {
                    return new Promise((resolve) => {
                        console.log(`[Terminal] Executing: ${args.command}`);

                        // Use spawn to allow finer control
                        const child = spawn(args.command, {
                            cwd: args.cwd || process.cwd(),
                            shell: true,
                            stdio: ['pipe', 'pipe', 'pipe']
                        });

                        // Pipe Parent Stdin (User keys) to Child Stdin if in terminal mode
                        if (process.stdin && child.stdin) {
                            // Best effort piping
                            try { process.stdin.pipe(child.stdin); } catch (e) { }
                        }

                        // Register with ProcessRegistry
                        this.registry.register(child, args.command);

                        let stdoutData = "";
                        let stderrData = "";

                        if (child.stdout) {
                            child.stdout.on('data', (d) => { stdoutData += d.toString(); });
                        }
                        if (child.stderr) {
                            child.stderr.on('data', (d) => { stderrData += d.toString(); });
                        }

                        child.on('error', (err) => {
                            resolve({ content: [{ type: "text", text: `Error: ${err.message}` }] });
                        });

                        child.on('close', (code) => {
                            // Unpipe to prevent leak
                            if (process.stdin) {
                                try { process.stdin.unpipe(child.stdin); } catch (e) { }
                            }

                            const output = stdoutData + (stderrData ? `\nSTDERR:\n${stderrData}` : "");
                            // Trim output to avoid huge message tokens
                            const trimmedOutput = output.length > 50000 ? output.substring(0, 50000) + "\n...[Output Truncated]" : output;

                            resolve({
                                content: [{ type: "text", text: trimmedOutput.trim() || `Command exited with code ${code}` }]
                            });
                        });
                    });
                }
            }
        ];
    }
}
