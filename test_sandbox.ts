
import { SandboxService } from './packages/core/src/security/SandboxService';

async function test() {
    console.log("Initializing SandboxService...");
    const sandbox = new SandboxService();

    console.log("Running Python Hello World...");
    const pyResult = await sandbox.execute('python', 'print("Hello from Python Sandbox")');
    console.log("Python Result:", pyResult);

    console.log("Running Node Hello World...");
    const jsResult = await sandbox.execute('node', 'console.log("Hello from Node Sandbox")');
    console.log("Node Result:", jsResult);
}

test().catch(console.error);
