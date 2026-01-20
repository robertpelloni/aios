#!/usr/bin/env node
import { Command } from "commander";
import React from 'react';
import { render } from 'ink';
import { App } from './ui/App.js';

const program = new Command();

program
  .name("borg")
  .description("The Ultimate Borg Operating System CLI")
  .version("0.1.0");

program
  .command("start")
  .description("Start the Borg Orchestrator")
  .action(async () => {
    console.log("Starting Orchestrator...");
    const { startOrchestrator } = await import('@borg/core');
    await startOrchestrator();
    // Keep process alive
    await new Promise(() => { });
  });

program
  .command("status")
  .description("Check Borg Status")
  .action(async () => {
    render(React.createElement(App, { view: 'status' }));
  });

program.parse(process.argv);
