import * as vscode from 'vscode';
import { io, Socket } from 'socket.io-client';

let socket: Socket | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Super AI Plugin is now active!');

    // Connect to Hub
    connectToHub();

    // Register Command
    let disposable = vscode.commands.registerCommand('super-ai.connect', () => {
        connectToHub();
        vscode.window.showInformationMessage('Super AI: Reconnecting to Hub...');
    });

    context.subscriptions.push(disposable);
}

function connectToHub() {
    if (socket?.connected) return;

    socket = io('http://localhost:3000', {
        query: { clientType: 'vscode' },
        reconnection: true
    });

    socket.on('connect', () => {
        console.log('Connected to Super AI Hub');
        vscode.window.setStatusBarMessage('$(plug) Super AI: Connected', 5000);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from Super AI Hub');
        vscode.window.setStatusBarMessage('$(error) Super AI: Disconnected', 5000);
    });

    socket.on('notification', (data: any) => {
        vscode.window.showInformationMessage(`Super AI: ${data.message}`);
    });
}

export function deactivate() {
    if (socket) {
        socket.disconnect();
    }
}
