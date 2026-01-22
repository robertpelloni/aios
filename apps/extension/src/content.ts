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

// Handle INSERT_TEXT from Background Script
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'INSERT_TEXT') {
        const text = message.text;
        console.log('[Borg Bridge] Inserting Text:', text);

        // Strategy: Try common selectors for AI chat inputs
        // 1. Google AI Studio / Gemini: `div[contenteditable="true"]`
        // 2. Generic: `textarea`
        const input = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');

        if (input) {
            input.focus();

            // Simulating typing is hard due to React/Frameworks.
            // Best effort: ExecCommand or value set + event dispatch.
            document.execCommand('insertText', false, text);

            // Dispatch input events to trigger Autosave/React state
            input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.error('[Borg Bridge] Could not find chat input.');
        }
    }

    if (message.type === 'SUBMIT_CHAT') {
        const input = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
        if (input) {
            console.log('[Borg Bridge] Submitting chat...');
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(enterEvent);
        }
    }

    if (message.type === 'CLICK_ELEMENT') {
        const targetText = message.target as string;
        console.log(`[Borg Bridge] Attempting to click element with text: "${targetText}"`);

        // Find by text content (XPath-like manually)
        // We prioritize buttons, then links, then generic divs with role=button
        const allElements = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'));

        const match = allElements.find(el => {
            // Check direct text or aria-label
            const text = (el.textContent || '').toLowerCase().trim();
            const label = (el.getAttribute('aria-label') || '').toLowerCase().trim();
            const search = targetText.toLowerCase().trim();
            return text === search || label === search || text.includes(search);
        });

        if (match) {
            (match as HTMLElement).click();
            console.log('[Borg Bridge] Clicked:', match);
        } else {
            console.warn('[Borg Bridge] No matching element found.');
        }
    }
});

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
