import { EventEmitter } from 'events';
import { 
    SessionClient, 
    createSessionClient 
} from '@apify/mcpc/dist/lib/session-client.js';
import * as BridgeManager from '@apify/mcpc/dist/lib/bridge-manager.js';
import { 
    loadSessions, 
    getSession, 
    saveSession, 
    deleteSession,
    sessionExists
} from '@apify/mcpc/dist/lib/sessions.js';
import {
    loadAuthProfiles,
    getAuthProfile,
    saveAuthProfile,
    deleteAuthProfiles
} from '@apify/mcpc/dist/lib/auth/profiles.js';
import {
    ServerConfig,
    SessionData,
    AuthProfile
} from '@apify/mcpc/dist/lib/types.js';

export class McpClientManager extends EventEmitter {
    private activeClients: Map<string, SessionClient> = new Map();

    async listSessions(): Promise<SessionData[]> {
        const storage = await loadSessions();
        return Object.values(storage.sessions);
    }

    async getSession(name: string): Promise<SessionData | undefined> {
        return await getSession(name);
    }

    async saveSession(name: string, data: Omit<SessionData, 'name'>): Promise<void> {
        await saveSession(name, data);
        this.emit('sessions_updated');
    }

    async deleteSession(name: string): Promise<void> {
        if (this.activeClients.has(name)) {
            const client = this.activeClients.get(name);
            await client?.close();
            this.activeClients.delete(name);
        }

        try {
            await BridgeManager.stopBridge(name);
        } catch (e) {
            console.error(`Error stopping bridge for ${name}:`, e);
        }

        await deleteSession(name);
        this.emit('sessions_updated');
    }

    async connect(sessionName: string): Promise<SessionClient> {
        if (this.activeClients.has(sessionName)) {
            return this.activeClients.get(sessionName)!;
        }

        try {
            const client = await createSessionClient(sessionName);
            this.activeClients.set(sessionName, client);
            return client;
        } catch (error) {
            console.error(`Failed to connect to session ${sessionName}:`, error);
            throw error;
        }
    }

    async disconnect(sessionName: string): Promise<void> {
        if (this.activeClients.has(sessionName)) {
            const client = this.activeClients.get(sessionName);
            await client?.close();
            this.activeClients.delete(sessionName);
        }
    }

    async startSession(
        sessionName: string, 
        config: ServerConfig, 
        options: { 
            profileName?: string, 
            headers?: Record<string, string> 
        } = {}
    ): Promise<void> {
        const exists = await sessionExists(sessionName);
        if (!exists) {
            await saveSession(sessionName, {
                server: config,
                createdAt: new Date().toISOString(),
                status: 'active'
            });
        }

        await BridgeManager.startBridge({
            sessionName,
            serverConfig: config,
            profileName: options.profileName,
            headers: options.headers
        });

        await this.connect(sessionName);
        this.emit('sessions_updated');
    }

    async restartSession(sessionName: string): Promise<void> {
        await this.disconnect(sessionName);
        await BridgeManager.restartBridge(sessionName);
        await this.connect(sessionName);
    }

    async listTools(sessionName: string) {
        const client = await this.connect(sessionName);
        return await client.listTools();
    }

    async callTool(sessionName: string, toolName: string, args: any) {
        const client = await this.connect(sessionName);
        return await client.callTool(toolName, args);
    }

    async listResources(sessionName: string) {
        const client = await this.connect(sessionName);
        return await client.listResources();
    }

    async readResource(sessionName: string, uri: string) {
        const client = await this.connect(sessionName);
        return await client.readResource(uri);
    }

    async listPrompts(sessionName: string) {
        const client = await this.connect(sessionName);
        return await client.listPrompts();
    }

    async getPrompt(sessionName: string, name: string, args: any) {
        const client = await this.connect(sessionName);
        return await client.getPrompt(name, args);
    }

    async listAuthProfiles(): Promise<AuthProfile[]> {
        const storage = await loadAuthProfiles();
        const profiles: AuthProfile[] = [];
        for (const host in storage.profiles) {
            for (const name in storage.profiles[host]) {
                profiles.push(storage.profiles[host][name]);
            }
        }
        return profiles;
    }

    async getAuthProfile(serverUrl: string, profileName: string): Promise<AuthProfile | undefined> {
        return await getAuthProfile(serverUrl, profileName);
    }

    async saveAuthProfile(profile: AuthProfile): Promise<void> {
        await saveAuthProfile(profile);
    }

    async deleteAuthProfile(serverUrl: string, profileName: string): Promise<void> {
        await deleteAuthProfiles(serverUrl, profileName);
    }
}
