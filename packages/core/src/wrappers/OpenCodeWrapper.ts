import { CLIWrapper } from "./CLIWrapper.js";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export class OpenCodeWrapper implements CLIWrapper {
    name = "opencode";

    async isAvailable(): Promise<boolean> {
        try {
            await execAsync("opencode --version");
            return true;
        } catch (e) {
            return false;
        }
    }

    async execute(prompt: string): Promise<string> {
        try {
            // Assuming opencode cli structure similar to others
            const safePrompt = prompt.replace(/"/g, '\\"');
            const command = `opencode "${safePrompt}"`;

            const { stdout } = await execAsync(command);
            return stdout.trim();
        } catch (e: any) {
            return `Error executing OpenCode: ${e.message}`;
        }
    }
}
