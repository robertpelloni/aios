console.log('Borg Bridge: Active');

const HOST = window.location.hostname;

// 1. Inject a visual indicator
const badge = document.createElement('div');
badge.id = 'borg-badge';
badge.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background-color: #000;
  border-radius: 50%;
  border: 2px solid #00ff00;
  z-index: 9999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00ff00;
  font-weight: bold;
  font-family: monospace;
  box-shadow: 0 0 10px #00ff00;
  transition: all 0.3s ease;
`;
badge.innerText = 'AI';
document.body.appendChild(badge);

// 2. Messaging Bridge (Web Page <-> Extension)
window.addEventListener('message', (event) => {
    // Only accept messages from the page itself (trusted page scripts)
    if (event.source !== window) return;

    if (event.data?.type === 'BORG_TOOL_CALL') {
        console.log('[Borg Bridge] Forwarding Tool Call:', event.data.payload);
        chrome.runtime.sendMessage({
            type: 'EXECUTE_MCP_TOOL',
            ...event.data.payload
        }, (response) => {
            // Send result back to page
            window.postMessage({
                type: 'BORG_TOOL_RESULT',
                payload: response
            }, '*');
        });
    }
});
