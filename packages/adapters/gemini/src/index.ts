#!/usr/bin/env node
import { io } from 'socket.io-client';
import { spawn } from 'child_process';

const HUB_URL = process.env.SUPER_AI_HUB_URL || 'http://localhost:3000';
const socket = io(HUB_URL, { query: { clientType: 'cli-adapter-gemini' } });

// Hook into the process
const args = process.argv.slice(2);

console.error('[SuperAI] Gemini Adapter Active');

// Emit Pre-Hook
socket.emit('hook_event', {
    type: 'PreToolUse',
    tool: 'gemini_cli',
    args: args
});

// Run actual command
// We assume 'gemini-real' is the actual binary, or we just pass through
// For this skeleton, we'll mock the execution or try to run 'gemini' if it differs from this script name
const cmd = spawn('echo', ['[Mock Gemini Execution]', ...args], { stdio: 'inherit' });

cmd.on('close', (code) => {
    // Emit Post-Hook
    socket.emit('hook_event', {
        type: 'PostToolUse',
        tool: 'gemini_cli',
        result: { code }
    });

    // Give socket time to flush
    setTimeout(() => {
        socket.disconnect();
        process.exit(code || 0);
    }, 500);
});
