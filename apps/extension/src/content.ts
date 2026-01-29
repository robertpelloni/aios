
// Content Script
// Injects the 'borg' object into the page context

// Helper to inject a script tag for page-context access
function injectScript(file_path: string) {
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', file_path);
    (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from Page (window.postMessage)
window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.type && (event.data.type === "BORG_REQUEST")) {
        // Forward to Background
        chrome.runtime.sendMessage({
            type: 'EXECUTE_TOOL',
            tool: event.data.tool,
            args: event.data.args
        }, (response) => {
            // Send result back to Page
            window.postMessage({
                type: "BORG_RESPONSE",
                id: event.data.id,
                result: response
            }, "*");
        });
    }
});

console.log("[Borg Bridge] Content Script Loaded.");

// Inject the API
const injectAPI = () => {
    const script = document.createElement('script');
    script.textContent = `
    console.log("[Borg Bridge] API Injected");
    `;
    (document.head || document.documentElement).appendChild(script);
};
injectAPI();

// Listen for messages from Background (WebSocket events)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PASTE_INTO_CHAT') {
        console.log("[Borg Bridge] Received Paste Request:", message.text);

        // Inject script to call window.injectDirectorMessage
        // We escape the text carefully to avoid syntax errors
        const safeText = JSON.stringify(message.text);
        const autoSubmit = message.submit ? 'true' : 'false';

        const script = document.createElement('script');
        script.textContent = `
            if (window.injectDirectorMessage) {
                window.injectDirectorMessage(${safeText}, ${autoSubmit});
            } else {
                console.warn("[Borg Bridge] window.injectDirectorMessage not found! Is DirectorChat mounted?");
            }
        `;
        (document.head || document.documentElement).appendChild(script);
        script.remove(); // Cleanup
    }
});
