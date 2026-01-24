interface TestResult {
    passed: boolean;
    output: string;
    testFile?: string;
    duration?: number;
}
/**
 * Auto-Test Runner
 * Automatically detects and runs relevant tests for modified files
 */
export declare class TestRunner {
    private projectRoot;
    constructor(projectRoot?: string);
    /**
     * Detect the test framework used in the project
     */
    detectTestFramework(): Promise<'jest' | 'vitest' | 'mocha' | 'npm-test' | 'unknown'>;
    /**
     * Find test files related to a source file
     */
    findRelatedTests(sourceFile: string): Promise<string[]>;
    /**
     * Run tests for a specific file or all tests
     */
    runTests(options?: {
        testFile?: string;
        all?: boolean;
        timeout?: number;
    }): Promise<TestResult>;
    /**
     * Run tests for a modified file and its related tests
     */
    runForModifiedFile(filePath: string): Promise<TestResult>;
}
/**
 * TestRunner Tools for MCP integration
 */
export declare const TestRunnerTools: (projectRoot?: string) => ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            testFile: {
                type: string;
                description: string;
            };
            all: {
                type: string;
                description: string;
            };
            sourceFile?: undefined;
            filePath?: undefined;
        };
        required?: undefined;
    };
    handler: (args: {
        testFile?: string;
        all?: boolean;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            sourceFile: {
                type: string;
                description: string;
            };
            testFile?: undefined;
            all?: undefined;
            filePath?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        sourceFile: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            testFile?: undefined;
            all?: undefined;
            sourceFile?: undefined;
            filePath?: undefined;
        };
        required?: undefined;
    };
    handler: () => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            filePath: {
                type: string;
                description: string;
            };
            testFile?: undefined;
            all?: undefined;
            sourceFile?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        filePath: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
export {};
//# sourceMappingURL=TestRunnerTools.d.ts.map