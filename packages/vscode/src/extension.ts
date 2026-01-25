import * as vscode from 'vscode';
import WebSocket from 'ws';

let socket: WebSocket | null = null;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let reconnectTimer: NodeJS.Timeout | null = null;
let lastActivityTime = Date.now();
let debounceTimer: NodeJS.Timeout | null = null;
let ignoreNextActivity = false; // Flag to prevent self-lockout

export function activate(context: vscode.ExtensionContext) {
    console.log('Borg Plugin is now active!');
    outputChannel = vscode.window.createOutputChannel('Borg Hub');

    // Status Bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'borg.connect';
    updateStatusBar(false);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Commands
    context.subscriptions.push(vscode.commands.registerCommand('borg.connect', connectToHub));
    context.subscriptions.push(vscode.commands.registerCommand('borg.disconnect', disconnectFromHub));

    // Auto Connect
    connectToHub();

    // Track User Activity - Crucial for Anti-Hijack
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => {
        if (ignoreNextActivity) {
            // This is a programmatic change (paste), ignore it for activity tracking
            return;
        }
        lastActivityTime = Date.now();
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(sendActivity, 1000);
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => {
        if (ignoreNextActivity) {
            return;
        }
        lastActivityTime = Date.now();
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(sendActivity, 1000);
    }));
}

export function deactivate() {
    disconnectFromHub();
}

function sendActivity() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'USER_ACTIVITY',
            lastActivityTime: Date.now()
        }));
    }
}

function updateStatusBar(connected: boolean) {
    if (connected) {
        statusBarItem.text = `$(plug) Borg: Connected`;
        statusBarItem.tooltip = `Connected to Borg Core`;
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = `$(debug-disconnect) Borg: Disconnected`;
        statusBarItem.tooltip = 'Click to Connect';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

function log(message: string) {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] ${message}`);
}

function connectToHub() {
    if (socket) return;

    // Standard Borg Core WebSocket Port
    const url = 'ws://localhost:3001';

    log(`Connecting to ${url}...`);

    try {
        socket = new WebSocket(url);

        socket.on('open', () => {
            log('Connected to Borg Hub');
            updateStatusBar(true);
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            vscode.window.showInformationMessage('Connected to Borg Core');
        });

        socket.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                handleMessage(message);
            } catch (e) {
                log(`Failed to parse message: ${e}`);
            }
        });

        socket.on('close', () => {
            log('Disconnected');
            updateStatusBar(false);
            socket = null;
            // Auto reconnect
            reconnectTimer = setTimeout(connectToHub, 5000);
        });

        socket.on('error', (err) => {
            log(`Error: ${err.message}`);
            socket?.close();
        });

    } catch (e: any) {
        log(`Connection setup error: ${e.message}`);
    }
}

function disconnectFromHub() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket) {
        socket.close();
        socket = null;
    }
    updateStatusBar(false);
}

async function handleMessage(msg: any) {
    // log(`Received: ${JSON.stringify(msg)}`);

    if (msg.type === 'GET_USER_ACTIVITY') {
        if (socket) {
            socket.send(JSON.stringify({
                type: 'USER_ACTIVITY',
                requestId: msg.requestId,
                lastActivityTime,
                isIdle: (Date.now() - lastActivityTime) > 5000 // 5s idle threshold
            }));
        }
    }

    if (msg.type === 'VSCODE_COMMAND') {
        const { command, args } = msg;
        try {
            await vscode.commands.executeCommand(command, ...(args || []));
            log(`Executed: ${command}`);
        } catch (e: any) {
            log(`Failed to execute ${command}: ${e.message}`);
        }
    }

    if (msg.type === 'PASTE_INTO_CHAT') {
        log(`[PASTE_INTO_CHAT] Received. text=${msg.text?.substring(0, 30)}...`);
        try {
            // Intelligent Interjection Check
            if ((Date.now() - lastActivityTime) < 2000 && !ignoreNextActivity) {
                log(`[PASTE_ABORT] User active within 2s, aborting paste to prevent hijack.`);
                return; // Abort
            }

            // SET FLAG TO IGNORE SUBSEQUENT ACTIVITY (THE PASTE ITSELF)
            ignoreNextActivity = true;
            // Reset flag after 1.5s (enough time for paste + events to fire)
            setTimeout(() => { ignoreNextActivity = false; }, 1500);

            // 1. Write to Clipboard
            await vscode.env.clipboard.writeText(msg.text);

            // 2. Open & Focus Chat
            await vscode.commands.executeCommand('workbench.action.chat.open');
            await new Promise(r => setTimeout(r, 300));

            // 3. Force Focus Input (Crucial)
            await vscode.commands.executeCommand('workbench.action.chat.focusInput');
            await new Promise(r => setTimeout(r, 200));

            // 4. Paste
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            log(`[DEBUG] Pasted to chat successfully`);

            if (msg.submit) {
                await new Promise(r => setTimeout(r, 800)); // Delay for clipboard paste to complete
                log(`[SUBMIT] Attempting extension-side submit...`);
                // Try multiple submit commands
                const commands = [
                    'workbench.action.chat.submit',
                    'workbench.action.chat.send',
                    'interactive.acceptChanges'
                ];
                for (const cmd of commands) {
                    try {
                        await vscode.commands.executeCommand(cmd);
                    } catch (e) { }
                }
            }

        } catch (e: any) {
            log(`Failed to paste into chat: ${e.message}`);
            ignoreNextActivity = false;
        }
    }

    if (msg.type === 'GET_STATUS') {
        const activeTerminal = vscode.window.activeTerminal;
        const status = {
            activeEditor: vscode.window.activeTextEditor?.document.fileName || null,
            activeTerminal: activeTerminal ? activeTerminal.name : null,
            workspace: vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || []
        };

        if (socket) {
            socket.send(JSON.stringify({
                type: 'STATUS_UPDATE',
                requestId: msg.requestId,
                status
            }));
        }
    }
}
