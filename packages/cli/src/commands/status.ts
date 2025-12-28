import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';

export const statusCommand = new Command('status')
  .description('Check the status of the Super AI Core Service')
  .option('-u, --url <string>', 'Core Service URL', 'http://localhost:3000')
  .action(async (options) => {
    try {
        const { data } = await axios.get(`${options.url}/api/system`);
        console.log(chalk.green('✓ Core Service is Online'));
        console.log(`Version: ${chalk.bold(data.version)}`);

        console.log('\nSubmodules:');
        data.submodules.forEach((sub: any) => {
            const color = sub.status === 'synced' ? chalk.green : chalk.yellow;
            console.log(`- ${sub.path}: ${color(sub.status)} (${sub.version.substring(0,7)})`);
        });

    } catch (e: any) {
        console.log(chalk.red('✗ Core Service is Offline or Unreachable'));
        console.log(`Error: ${e.message}`);
    }
  });
