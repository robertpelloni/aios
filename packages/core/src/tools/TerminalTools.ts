import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export const TerminalTools = [
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
            try {
                const { stdout, stderr } = await execAsync(args.command, { cwd: args.cwd });
                const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : "");
                return { content: [{ type: "text", text: output.trim() || "Command executed successfully with no output." }] };
            } catch (err: any) {
                return { content: [{ type: "text", text: `Error: ${err.message}\nSTDOUT: ${err.stdout}\nSTDERR: ${err.stderr}` }] };
            }
        }
    }
];
