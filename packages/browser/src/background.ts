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
