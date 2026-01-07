import { Command } from 'commander';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const startCommand = new Command('start')
  .description('Start the AIOS Core Service')
  .option('-p, --port <number>', 'Port to run on', '3000')
  .option('-d, --detached', 'Run in detached mode')
  .action((options) => {
    console.log(`Starting AIOS Core on port ${options.port}...`);

    // Resolve path to core package
    // Assuming structure: packages/cli/dist/commands -> packages/cli/dist -> packages/cli -> packages/core
    // Correct path relative to source: packages/cli/src/commands -> ... -> packages/core
    // But we run from dist.

    const corePath = path.resolve(__dirname, '../../../core');

    if (!fs.existsSync(corePath)) {
        console.error('Core package not found at:', corePath);
        process.exit(1);
    }

    const child = spawn('pnpm', ['--filter', '@aios/core', 'start'], {
        stdio: options.detached ? 'ignore' : 'inherit',
        detached: options.detached,
        env: { ...process.env, PORT: options.port }
    });

    if (options.detached) {
        child.unref();
        console.log('Core service started in background.');
    }
  });
