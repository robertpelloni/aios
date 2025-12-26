import { io } from 'socket.io-client';

console.log('Super AI Browser Extension Loaded');

// Connect to Hub
const socket = io('http://localhost:3000', {
    query: { clientType: 'browser' },
    reconnection: true,
    transports: ['websocket'] // Force websocket in service worker
});

socket.on('connect', () => {
    console.log('[Browser] Connected to Hub');
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
});

socket.on('disconnect', () => {
    console.log('[Browser] Disconnected from Hub');
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
});

// Listen for commands from Hub
socket.on('browser:navigate', (data) => {
    if (data.url) {
        chrome.tabs.create({ url: data.url });
    }
});

// Handle 'read_page' requests from Hub
socket.on('browser:read_page', async (data, callback) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (response) => {
            if (callback) callback(response);
            socket.emit('browser:page_content', { ...response, requestId: data.requestId });
        });
    } else {
        if (callback) callback({ error: 'No active tab' });
    }
});

// Handle 'inject_text' requests from Hub
socket.on('browser:inject_text', async (data, callback) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'injectText', text: data.text }, (response) => {
            if (callback) callback(response);
        });
    } else {
        if (callback) callback({ error: 'No active tab' });
    }
});

// --- Active Context Loop ---
async function pushActiveTab() {
    if (!socket.connected) return;
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id && tab.url && !tab.url.startsWith('chrome://')) {
            chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (response) => {
                if (response) {
                    socket.emit('browser:active_tab_update', response);
                }
            });
        }
    } catch (e) {
        // Ignore errors (e.g., content script not ready)
    }
}

// Listen for tab changes
chrome.tabs.onActivated.addListener(() => pushActiveTab());
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        pushActiveTab();
    }
});
