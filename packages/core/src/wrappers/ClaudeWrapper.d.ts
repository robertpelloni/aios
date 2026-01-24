import { CLIWrapper } from "./CLIWrapper.js";
export declare class ClaudeWrapper implements CLIWrapper {
    name: string;
    isAvailable(): Promise<boolean>;
    execute(prompt: string): Promise<string>;
}
//# sourceMappingURL=ClaudeWrapper.d.ts.map