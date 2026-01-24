import { CLIWrapper } from "./CLIWrapper.js";
export declare class GeminiWrapper implements CLIWrapper {
    name: string;
    isAvailable(): Promise<boolean>;
    execute(prompt: string): Promise<string>;
}
//# sourceMappingURL=GeminiWrapper.d.ts.map