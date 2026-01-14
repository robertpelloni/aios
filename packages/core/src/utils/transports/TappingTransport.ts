import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { EventEmitter } from "events";

export class TappingTransport extends EventEmitter implements Transport {
  constructor(private transport: Transport) {
    super();
  }

  async start(): Promise<void> {
    await this.transport.start();
    this.transport.onmessage = (message: JSONRPCMessage) => {
      this.emit("message", { direction: "in", message, timestamp: Date.now() });
      if (this.onmessage) {
        this.onmessage(message);
      }
    };
    
    this.transport.onclose = () => {
      this.emit("close");
      if (this.onclose) {
        this.onclose();
      }
    };
    
    this.transport.onerror = (error) => {
        this.emit("error", error);
        if (this.onerror) {
            this.onerror(error);
        }
    }
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.emit("message", { direction: "out", message, timestamp: Date.now() });
    return this.transport.send(message);
  }

  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;
}
