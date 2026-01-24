import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);
export class GeminiWrapper {
    name = "gemini";
    async isAvailable() {
        try {
            await execAsync("gemini --version");
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async execute(prompt) {
        // Warning: This assumes 'gemini' CLI supports a direct prompt flag or piped input.
        // If it requires interactive mode, we might need a more complex spawn/expect harness.
        // For now, we assume standard stdin piping works: `echo "prompt" | gemini`
        // Or if it strictly requires arguments: `gemini prompt "..."`
        // Strategy: Pipe input to avoid argument length limits and shell escaping madness
        const command = `gemini "${prompt.replace(/"/g, '\\"')}"`; // Basic escaping
        try {
            const { stdout, stderr } = await execAsync(command);
            if (stderr && stderr.length > 0 && !stderr.includes("Update available")) { // Filter noise
                console.warn(`[GeminiWrapper] Stderr: ${stderr}`);
            }
            return stdout.trim();
        }
        catch (e) {
            return `Error executing Gemini CLI: ${e.message}`;
        }
    }
}
