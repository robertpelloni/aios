import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

export const runAgentCommand = new Command('run')
  .description('Run an agent task')
  .argument('<agent>', 'Name of the agent to run')
  .argument('<task>', 'The task description')
  .option('-u, --url <string>', 'Core Service URL', 'http://localhost:3000')
  .action(async (agentName, task, options) => {
    const spinner = ora(`Running agent ${agentName}...`).start();
    try {
        const { data } = await axios.post(`${options.url}/api/agents/run`, {
            agentName,
            task
        });
        spinner.succeed('Agent Finished');
        console.log(chalk.cyan('\nResult:'));
        console.log(data.result);
    } catch (e: any) {
        spinner.fail('Agent Failed');
        if (e.response) {
            console.error(chalk.red(e.response.data.error || e.message));
        } else {
            console.error(chalk.red(e.message));
        }
    }
  });
