
// Popup Logic
console.log('Popup opened');
const statusSpan = document.getElementById('status');

// Helper to query background script for status
async function checkStatus() {
    if (chrome.runtime && chrome.runtime.sendMessage) {
        // Simple ping to background (not implemented yet, just checking connection)
        // ideally background script handles a 'GET_STATUS' message
        // For now, just show "Installed"
        if (statusSpan) {
            statusSpan.textContent = "Extension Loaded";
            statusSpan.className = "status online";
        }
    }
}

checkStatus();
