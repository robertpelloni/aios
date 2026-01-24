import { CLIWrapper } from "./CLIWrapper.js";
export declare class OpenCodeWrapper implements CLIWrapper {
    name: string;
    isAvailable(): Promise<boolean>;
    execute(prompt: string): Promise<string>;
}
//# sourceMappingURL=OpenCodeWrapper.d.ts.map