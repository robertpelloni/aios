export interface CLIWrapper {
    /**
     * Unique identifier for the CLI (e.g. 'gemini', 'claude').
     */
    name: string;

    /**
     * Checks if the CLI is installed and available in the PATH.
     */
    isAvailable(): Promise<boolean>;

    /**
     * Executes a single prompt against the CLI and returns the result.
     * This assumes a non-interactive or "one-shot" mode if possible,
     * or handles the REPL interaction internally.
     */
    execute(prompt: string): Promise<string>;
}
