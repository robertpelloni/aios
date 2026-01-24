import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';
const execAsync = util.promisify(exec);
/**
 * Auto-Test Runner
 * Automatically detects and runs relevant tests for modified files
 */
export class TestRunner {
    projectRoot;
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
    }
    /**
     * Detect the test framework used in the project
     */
    async detectTestFramework() {
        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            const content = await fs.readFile(packageJsonPath, 'utf-8');
            const pkg = JSON.parse(content);
            // Check devDependencies
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            if (deps['vitest'])
                return 'vitest';
            if (deps['jest'])
                return 'jest';
            if (deps['mocha'])
                return 'mocha';
            if (pkg.scripts?.test)
                return 'npm-test';
            return 'unknown';
        }
        catch {
            return 'unknown';
        }
    }
    /**
     * Find test files related to a source file
     */
    async findRelatedTests(sourceFile) {
        const baseName = path.basename(sourceFile, path.extname(sourceFile));
        const dir = path.dirname(sourceFile);
        const testPatterns = [
            `${baseName}.test.ts`,
            `${baseName}.test.js`,
            `${baseName}.spec.ts`,
            `${baseName}.spec.js`,
            `__tests__/${baseName}.ts`,
            `__tests__/${baseName}.js`,
        ];
        const foundTests = [];
        for (const pattern of testPatterns) {
            const testPath = path.join(dir, pattern);
            try {
                await fs.access(testPath);
                foundTests.push(testPath);
            }
            catch {
                // Test file doesn't exist
            }
        }
        // Also check for __tests__ directory
        const testsDir = path.join(dir, '__tests__');
        try {
            const files = await fs.readdir(testsDir);
            for (const file of files) {
                if (file.includes(baseName)) {
                    foundTests.push(path.join(testsDir, file));
                }
            }
        }
        catch {
            // __tests__ directory doesn't exist
        }
        return foundTests;
    }
    /**
     * Run tests for a specific file or all tests
     */
    async runTests(options = {}) {
        const framework = await this.detectTestFramework();
        const timeout = options.timeout || 60000;
        const startTime = Date.now();
        let command;
        switch (framework) {
            case 'vitest':
                command = options.testFile
                    ? `npx vitest run ${options.testFile} --reporter=verbose`
                    : 'npx vitest run --reporter=verbose';
                break;
            case 'jest':
                command = options.testFile
                    ? `npx jest ${options.testFile} --verbose`
                    : 'npx jest --verbose';
                break;
            case 'mocha':
                command = options.testFile
                    ? `npx mocha ${options.testFile}`
                    : 'npx mocha';
                break;
            case 'npm-test':
                command = 'npm test';
                break;
            default:
                return {
                    passed: false,
                    output: 'No test framework detected. Please configure jest, vitest, or mocha.',
                    duration: Date.now() - startTime
                };
        }
        console.log(`[TestRunner] Running: ${command}`);
        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: this.projectRoot,
                timeout,
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });
            const output = stdout + (stderr ? `\n${stderr}` : '');
            const passed = !output.toLowerCase().includes('failed') &&
                !output.toLowerCase().includes('error');
            return {
                passed,
                output: output.substring(0, 5000), // Limit output size
                testFile: options.testFile,
                duration: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                passed: false,
                output: error.stdout || error.message,
                testFile: options.testFile,
                duration: Date.now() - startTime
            };
        }
    }
    /**
     * Run tests for a modified file and its related tests
     */
    async runForModifiedFile(filePath) {
        console.log(`[TestRunner] Finding tests for: ${filePath}`);
        const relatedTests = await this.findRelatedTests(filePath);
        if (relatedTests.length === 0) {
            return {
                passed: true,
                output: `No test files found for ${path.basename(filePath)}`,
                duration: 0
            };
        }
        console.log(`[TestRunner] Found ${relatedTests.length} related tests`);
        // Run the first related test file
        return await this.runTests({ testFile: relatedTests[0] });
    }
}
/**
 * TestRunner Tools for MCP integration
 */
export const TestRunnerTools = (projectRoot = process.cwd()) => {
    const runner = new TestRunner(projectRoot);
    return [
        {
            name: "run_tests",
            description: "Run tests for the project. Optionally specify a specific test file.",
            inputSchema: {
                type: "object",
                properties: {
                    testFile: { type: "string", description: "Optional specific test file to run" },
                    all: { type: "boolean", description: "Run all tests (default: true if no testFile)" }
                }
            },
            handler: async (args) => {
                const result = await runner.runTests(args);
                const status = result.passed ? '✅ PASSED' : '❌ FAILED';
                return {
                    content: [{
                            type: "text",
                            text: `Test Result: ${status}\nDuration: ${result.duration}ms\n\n${result.output}`
                        }]
                };
            }
        },
        {
            name: "find_related_tests",
            description: "Find test files related to a source file",
            inputSchema: {
                type: "object",
                properties: {
                    sourceFile: { type: "string", description: "Path to the source file" }
                },
                required: ["sourceFile"]
            },
            handler: async (args) => {
                const tests = await runner.findRelatedTests(args.sourceFile);
                if (tests.length === 0) {
                    return { content: [{ type: "text", text: "No related test files found." }] };
                }
                return {
                    content: [{
                            type: "text",
                            text: `Found ${tests.length} related test(s):\n${tests.map(t => `- ${t}`).join('\n')}`
                        }]
                };
            }
        },
        {
            name: "detect_test_framework",
            description: "Detect the test framework used in the current project",
            inputSchema: { type: "object", properties: {} },
            handler: async () => {
                const framework = await runner.detectTestFramework();
                return {
                    content: [{
                            type: "text",
                            text: `Detected test framework: ${framework}`
                        }]
                };
            }
        },
        {
            name: "run_tests_for_file",
            description: "Automatically find and run tests related to a modified source file",
            inputSchema: {
                type: "object",
                properties: {
                    filePath: { type: "string", description: "Path to the modified source file" }
                },
                required: ["filePath"]
            },
            handler: async (args) => {
                const result = await runner.runForModifiedFile(args.filePath);
                const status = result.passed ? '✅ PASSED' : '❌ FAILED';
                return {
                    content: [{
                            type: "text",
                            text: `Auto-Test Result: ${status}\nDuration: ${result.duration}ms\n\n${result.output}`
                        }]
                };
            }
        }
    ];
};
