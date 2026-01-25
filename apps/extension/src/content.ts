
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
// We can't inject complex objects easily, but we can define a window property via a script.
// Or we just rely on the user knowing `window.postMessage`.
// For simplicity, let's just log availability.
