
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

async function handleToolExecution(toolName: string, args: any) {
    // We use the 'execute_tool' endpoint or Director?
    // Actually, TRPC doesn't expose raw 'executeTool' on root usually.
    // We might need to use 'director.chat' or 'server.executeTool' if exposed.

    // For now, let's assume we added a 'tools' router or use 'director.chat' for natural language.
    // If the web chat wants to read a file, it should ask the Director via NL?
    // OR we expose specific tools via a new router.

    // Let's use Director Chat for MVP "Do X".
    // But for direct "injections" (tool access), we need a direct pipe.

    // Fallback: If tool is 'read_file', use filesystem router (if exists) or just fail.
    // Wait, trpc.ts has 'remoteAccess'.

    // Let's rely on 'director.chat' for now: "Please read file X".
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
