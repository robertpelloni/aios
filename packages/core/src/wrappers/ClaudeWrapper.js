import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);
export class ClaudeWrapper {
    name = "claude";
    async isAvailable() {
        try {
            // 'claude' is the binary name for Claude Code
            await execAsync("claude --version");
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async execute(prompt) {
        // Claude Code is designed to be interactive, but it might support a non-interactive query mode.
        // Usually `claude -p "prompt"` or piping.
        // We will try the pipe method first as it's standard unix philosophy.
        // Note: Claude Code auth must be pre-configured.
        try {
            // Using -p flag if available, otherwise just passing the string
            // Escaping quotes is critical here.
            const safePrompt = prompt.replace(/"/g, '\\"');
            const command = `claude -p "${safePrompt}"`;
            const { stdout, stderr } = await execAsync(command);
            if (stderr) {
                // Claude output often goes to stderr for progress bars, etc.
                // We might need to capture both.
            }
            return stdout.trim() || stderr.trim(); // Return whatever we got
        }
        catch (e) {
            return `Error executing Claude Code: ${e.message}`;
        }
    }
}
