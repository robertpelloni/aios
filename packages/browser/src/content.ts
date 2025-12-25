// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageContent') {
        const content = document.body.innerText;
        const selection = window.getSelection()?.toString() || '';
        const title = document.title;
        const url = window.location.href;

        sendResponse({
            title,
            url,
            content: content.substring(0, 50000), // Limit payload
            selection
        });
    }
    return true; // Keep channel open
});
