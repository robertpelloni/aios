import { GeminiWrapper } from "../wrappers/GeminiWrapper.js";
import { ClaudeWrapper } from "../wrappers/ClaudeWrapper.js";
import { OpenCodeWrapper } from "../wrappers/OpenCodeWrapper.js";
const wrappers = [
    new GeminiWrapper(),
    new ClaudeWrapper(),
    new OpenCodeWrapper()
];
export const OrchestrationTools = wrappers.map(wrapper => ({
    name: `cli_${wrapper.name}_execute`,
    description: `Execute a prompt using the ${wrapper.name} CLI. Use this to delegate tasks to ${wrapper.name}.`,
    inputSchema: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: `The instruction or prompt to send to ${wrapper.name}.`
            }
        },
        required: ["prompt"]
    },
    handler: async (args) => {
        if (!await wrapper.isAvailable()) {
            return {
                content: [{ type: "text", text: `Error: ${wrapper.name} CLI is not installed or not found in PATH.` }]
            };
        }
        const result = await wrapper.execute(args.prompt);
        return {
            content: [{ type: "text", text: result }]
        };
    }
}));
