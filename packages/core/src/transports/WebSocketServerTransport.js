import { WebSocket } from 'ws';
export class WebSocketServerTransport {
    _ws = null;
    _wss;
    onclose;
    onerror;
    onmessage;
    constructor(wss) {
        this._wss = wss;
        this._wss.on('connection', (ws, req) => {
            console.log("New WebSocket connection");
            this._ws = ws;
            ws.on('message', (data) => {
                try {
                    const str = data.toString();
                    const message = JSON.parse(str);
                    this.onmessage?.(message);
                }
                catch (e) {
                    console.error("Failed to parse WS message", e);
                }
            });
            ws.on('close', () => {
                console.log("WebSocket disconnected");
                this.onclose?.();
            });
            ws.on('error', (err) => {
                this.onerror?.(err);
            });
        });
    }
    async close() {
        this._ws?.close();
        this._wss.close();
    }
    async send(message) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(message));
        }
    }
    async start() {
        // Already started via constructor listener
    }
}
