import { ModelSelector } from './ModelSelector.js';
import { PermissionManager } from "./security/PermissionManager.js";
export declare class MCPServer {
    private server;
    private wsServer;
    private router;
    modelSelector: ModelSelector;
    private skillRegistry;
    private mcpmRegistry;
    private director;
    private council;
    private spawner;
    permissionManager: PermissionManager;
    private vectorStore;
    private indexer;
    private pendingRequests;
    wssInstance: any;
    constructor(options?: {
        skipWebsocket?: boolean;
    });
    private createServerInstance;
    private broadcastRequestAndAwait;
    broadcast(type: string, payload: any): void;
    executeTool(name: string, args: any): Promise<any>;
    private setupHandlers;
    start(): Promise<void>;
}
//# sourceMappingURL=MCPServer.d.ts.map