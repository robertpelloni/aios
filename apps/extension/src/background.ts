
// Background Service Worker
// Proxies requests from Content Script (Web Page) to Local Borg Core (localhost:3000)

const CORE_URL = 'http://localhost:3000/trpc';

// Keep-alive setup for Service Worker
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_TOOL') {
        handleToolExecution(message.tool, message.args)
            .then(result => sendResponse({ success: true, result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Async response
    }

    if (message.type === 'CHECK_CONNECTION') {
        fetch(`${CORE_URL}/health`)
            .then(res => res.json())
            .then(data => sendResponse({ connected: data?.result?.data?.status === 'running' }))
            .catch(() => sendResponse({ connected: false }));
        return true;
    }

    if (message.type === 'SAVE_CONTEXT') {
        fetch(`${CORE_URL}/director.memorize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message.content, source: message.url })
        })
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});


// WebSocket Connection to Core
let ws: WebSocket | null = null;
const WS_URL = 'ws://localhost:3001'; // Default WS port for Borg Core

function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('[Borg Ext] WS Connected');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'PASTE_INTO_CHAT') {
                // Determine active tab
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: 'PASTE_INTO_CHAT',
                            text: data.text,
                            submit: data.submit
                        });
                    }
                });
            }
        } catch (e) {
            console.error('WS Error:', e);
        }
    };

    ws.onclose = () => {
        console.log('[Borg Ext] WS Closed. Reconnecting in 5s...');
        ws = null;
        setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (err) => {
        console.error('[Borg Ext] WS Error:', err);
        ws?.close();
    };
}

// Start WS
connectWebSocket();
chrome.runtime.onStartup.addListener(connectWebSocket);

async function handleToolExecution(toolName: string, args: any) {
    if (toolName === 'chat') {
        const response = await fetch(`${CORE_URL}/director.chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: args.message })
        });
        const json = await response.json();
        return json.result?.data;
    }
    throw new Error(`Tool ${toolName} not supported via Bridge yet.`);
}

