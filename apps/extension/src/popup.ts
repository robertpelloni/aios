
// Popup Logic
console.log("Popup loaded");

const statusSpan = document.getElementById('status')!;
const saveBtn = document.getElementById('saveBtn')!;
const msgDiv = document.getElementById('msg')!;

// 1. Check Connection
chrome.runtime.sendMessage({ type: 'CHECK_CONNECTION' }, (response) => {
    if (response && response.connected) {
        statusSpan.textContent = 'ONLINE';
        statusSpan.style.color = 'green';
        saveBtn.removeAttribute('disabled');
    } else {
        statusSpan.textContent = 'OFFLINE (Is borg start running?)';
        statusSpan.style.color = 'red';
        saveBtn.setAttribute('disabled', 'true');
    }
});

// 2. Save Context
saveBtn.addEventListener('click', async () => {
    msgDiv.textContent = 'Scraping...';

    // Get Active Tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    // Execute Script to get text
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            return document.body.innerText;
        }
    }, (results) => {
        if (!results || !results[0]) {
            msgDiv.textContent = 'Failed to scrape.';
            return;
        }

        const content = results[0].result;
        msgDiv.textContent = 'Saving to Borg...';

        // Send to Background
        chrome.runtime.sendMessage({
            type: 'SAVE_CONTEXT',
            content: content,
            url: tab.url
        }, (res) => {
            if (res.success) {
                msgDiv.textContent = 'Saved to Memory!';
                setTimeout(() => msgDiv.textContent = '', 3000);
            } else {
                msgDiv.textContent = 'Error: ' + res.error;
            }
        });
    });
});
