import { Command } from 'commander';
import { startTUI } from '../tui/index.js';

export const tuiCommand = new Command('tui')
    .description('Launch interactive terminal UI')
    .option('-a, --api <url>', 'API base URL', 'http://localhost:3000')
    .action((options) => {
        if (options.api) {
            process.env.AIOS_API = options.api;
        }
        startTUI();
    });
