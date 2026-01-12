/**
 * @module services/SecretService
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export type SecretType = 'api_key' | 'token' | 'password' | 'certificate' | 'ssh_key' | 'env_var' | 'generic';

export type SecretScope = 'global' | 'project' | 'environment' | 'user' | 'service';

export interface Secret {
    id: string;
    name: string;
    type: SecretType;
    scope: SecretScope;
    scopeId?: string;
    description?: string;
    encryptedValue: string;
    iv: string;
    version: number;
    rotationPolicy?: RotationPolicy;
    lastRotated?: Date;
    expiresAt?: Date;
    tags?: string[];
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    accessLog: SecretAccessLog[];
}

export interface SecretAccessLog {
    timestamp: Date;
    actorId: string;
    actorType: 'user' | 'service' | 'system';
    action: 'read' | 'write' | 'rotate' | 'delete';
    ip?: string;
    success: boolean;
    reason?: string;
}

export interface RotationPolicy {
    enabled: boolean;
    intervalDays: number;
    notifyBeforeDays: number;
    autoRotate: boolean;
    rotationHandler?: string;
}

export interface SecretReference {
    secretId: string;
    version?: number;
    key?: string;
}

export interface SecretConfig {
    encryptionKey: string;
    algorithm: string;
    maxAccessLogEntries: number;
    defaultRotationDays: number;
    auditAllAccess: boolean;
}

const DEFAULT_CONFIG: SecretConfig = {
    encryptionKey: crypto.randomBytes(32).toString('hex'),
    algorithm: 'aes-256-gcm',
    maxAccessLogEntries: 100,
    defaultRotationDays: 90,
    auditAllAccess: true,
};

export class SecretService extends EventEmitter {
    private config: SecretConfig;
    private secrets: Map<string, Secret> = new Map();
    private encryptionKey: Buffer;
    private rotationCheckTimer?: ReturnType<typeof setInterval>;

    constructor(config: Partial<SecretConfig> = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.encryptionKey = Buffer.from(this.config.encryptionKey, 'hex');
        this.startRotationCheck();
    }

    async createSecret(params: {
        name: string;
        value: string;
        type: SecretType;
        scope: SecretScope;
        scopeId?: string;
        description?: string;
        rotationPolicy?: RotationPolicy;
        expiresAt?: Date;
        tags?: string[];
        metadata?: Record<string, unknown>;
        createdBy: string;
    }): Promise<Omit<Secret, 'encryptedValue' | 'iv'>> {
        const existingByName = this.findByName(params.name, params.scope, params.scopeId);
        if (existingByName) {
            throw new Error(`Secret with name '${params.name}' already exists in this scope`);
        }

        const { encrypted, iv } = this.encrypt(params.value);

        const secret: Secret = {
            id: this.generateId(),
            name: params.name,
            type: params.type,
            scope: params.scope,
            scopeId: params.scopeId,
            description: params.description,
            encryptedValue: encrypted,
            iv,
            version: 1,
            rotationPolicy: params.rotationPolicy,
            expiresAt: params.expiresAt,
            tags: params.tags,
            metadata: params.metadata,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: params.createdBy,
            accessLog: [],
        };

        this.secrets.set(secret.id, secret);
        this.logAccess(secret, params.createdBy, 'user', 'write', true);
        this.emit('secret:created', this.sanitizeSecret(secret));

        return this.sanitizeSecret(secret);
    }

    async getSecret(
        secretId: string,
        actorId: string,
        actorType: 'user' | 'service' | 'system' = 'user'
    ): Promise<string | null> {
        const secret = this.secrets.get(secretId);
        if (!secret) {
            this.emit('secret:access_denied', { secretId, actorId, reason: 'not_found' });
            return null;
        }

        if (secret.expiresAt && secret.expiresAt < new Date()) {
            this.logAccess(secret, actorId, actorType, 'read', false, 'expired');
            this.emit('secret:access_denied', { secretId, actorId, reason: 'expired' });
            return null;
        }

        const decrypted = this.decrypt(secret.encryptedValue, secret.iv);
        this.logAccess(secret, actorId, actorType, 'read', true);
        this.emit('secret:accessed', { secretId, actorId, actorType });

        return decrypted;
    }

    async getSecretByName(
        name: string,
        scope: SecretScope,
        scopeId: string | undefined,
        actorId: string,
        actorType: 'user' | 'service' | 'system' = 'user'
    ): Promise<string | null> {
        const secret = this.findByName(name, scope, scopeId);
        if (!secret) return null;
        return this.getSecret(secret.id, actorId, actorType);
    }

    async updateSecret(
        secretId: string,
        value: string,
        actorId: string
    ): Promise<Omit<Secret, 'encryptedValue' | 'iv'> | null> {
        const secret = this.secrets.get(secretId);
        if (!secret) return null;

        const { encrypted, iv } = this.encrypt(value);

        secret.encryptedValue = encrypted;
        secret.iv = iv;
        secret.version++;
        secret.updatedAt = new Date();

        this.logAccess(secret, actorId, 'user', 'write', true);
        this.emit('secret:updated', this.sanitizeSecret(secret));

        return this.sanitizeSecret(secret);
    }

    async rotateSecret(
        secretId: string,
        newValue: string,
        actorId: string
    ): Promise<Omit<Secret, 'encryptedValue' | 'iv'> | null> {
        const secret = this.secrets.get(secretId);
        if (!secret) return null;

        const { encrypted, iv } = this.encrypt(newValue);

        secret.encryptedValue = encrypted;
        secret.iv = iv;
        secret.version++;
        secret.lastRotated = new Date();
        secret.updatedAt = new Date();

        this.logAccess(secret, actorId, 'user', 'rotate', true);
        this.emit('secret:rotated', this.sanitizeSecret(secret));

        return this.sanitizeSecret(secret);
    }

    async deleteSecret(secretId: string, actorId: string): Promise<boolean> {
        const secret = this.secrets.get(secretId);
        if (!secret) return false;

        this.logAccess(secret, actorId, 'user', 'delete', true);
        this.secrets.delete(secretId);
        this.emit('secret:deleted', { secretId, actorId });

        return true;
    }

    listSecrets(options: {
        scope?: SecretScope;
        scopeId?: string;
        type?: SecretType;
        tags?: string[];
        includeExpired?: boolean;
    } = {}): Array<Omit<Secret, 'encryptedValue' | 'iv'>> {
        let secrets = Array.from(this.secrets.values());

        if (options.scope) {
            secrets = secrets.filter(s => s.scope === options.scope);
        }
        if (options.scopeId) {
            secrets = secrets.filter(s => s.scopeId === options.scopeId);
        }
        if (options.type) {
            secrets = secrets.filter(s => s.type === options.type);
        }
        if (options.tags?.length) {
            secrets = secrets.filter(s => options.tags!.some(t => s.tags?.includes(t)));
        }
        if (!options.includeExpired) {
            const now = new Date();
            secrets = secrets.filter(s => !s.expiresAt || s.expiresAt > now);
        }

        return secrets.map(s => this.sanitizeSecret(s));
    }

    getSecretMetadata(secretId: string): Omit<Secret, 'encryptedValue' | 'iv'> | null {
        const secret = this.secrets.get(secretId);
        if (!secret) return null;
        return this.sanitizeSecret(secret);
    }

    getAccessLog(secretId: string, limit = 50): SecretAccessLog[] {
        const secret = this.secrets.get(secretId);
        if (!secret) return [];
        return secret.accessLog.slice(-limit);
    }

    getExpiringSecrets(withinDays = 30): Array<Omit<Secret, 'encryptedValue' | 'iv'>> {
        const threshold = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
        const now = new Date();

        return Array.from(this.secrets.values())
            .filter(s => s.expiresAt && s.expiresAt > now && s.expiresAt <= threshold)
            .map(s => this.sanitizeSecret(s));
    }

    getSecretsNeedingRotation(): Array<Omit<Secret, 'encryptedValue' | 'iv'>> {
        const now = new Date();

        return Array.from(this.secrets.values())
            .filter(s => {
                if (!s.rotationPolicy?.enabled) return false;
                const lastRotation = s.lastRotated || s.createdAt;
                const nextRotation = new Date(lastRotation.getTime() + s.rotationPolicy.intervalDays * 24 * 60 * 60 * 1000);
                return nextRotation <= now;
            })
            .map(s => this.sanitizeSecret(s));
    }

    async bulkResolve(
        refs: SecretReference[],
        actorId: string,
        actorType: 'user' | 'service' | 'system' = 'service'
    ): Promise<Map<string, string | null>> {
        const results = new Map<string, string | null>();

        for (const ref of refs) {
            const value = await this.getSecret(ref.secretId, actorId, actorType);
            results.set(ref.secretId, value);
        }

        return results;
    }

    async resolveEnvVars(
        scope: SecretScope,
        scopeId: string | undefined,
        actorId: string
    ): Promise<Record<string, string>> {
        const secrets = this.listSecrets({ scope, scopeId, type: 'env_var' });
        const env: Record<string, string> = {};

        for (const secret of secrets) {
            const value = await this.getSecret(secret.id, actorId, 'service');
            if (value) {
                env[secret.name] = value;
            }
        }

        return env;
    }

    private encrypt(plaintext: string): { encrypted: string; iv: string } {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.config.algorithm, this.encryptionKey, iv) as crypto.CipherGCM;
        
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        return {
            encrypted: encrypted + ':' + authTag.toString('hex'),
            iv: iv.toString('hex'),
        };
    }

    private decrypt(encryptedData: string, ivHex: string): string {
        const [encrypted, authTagHex] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv(this.config.algorithm, this.encryptionKey, iv) as crypto.DecipherGCM;
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    private findByName(name: string, scope: SecretScope, scopeId?: string): Secret | undefined {
        return Array.from(this.secrets.values()).find(
            s => s.name === name && s.scope === scope && s.scopeId === scopeId
        );
    }

    private logAccess(
        secret: Secret,
        actorId: string,
        actorType: 'user' | 'service' | 'system',
        action: SecretAccessLog['action'],
        success: boolean,
        reason?: string
    ): void {
        if (!this.config.auditAllAccess && action === 'read' && success) return;

        const log: SecretAccessLog = {
            timestamp: new Date(),
            actorId,
            actorType,
            action,
            success,
            reason,
        };

        secret.accessLog.push(log);

        if (secret.accessLog.length > this.config.maxAccessLogEntries) {
            secret.accessLog = secret.accessLog.slice(-this.config.maxAccessLogEntries);
        }
    }

    private sanitizeSecret(secret: Secret): Omit<Secret, 'encryptedValue' | 'iv'> {
        const { encryptedValue, iv, ...safe } = secret;
        return safe;
    }

    private generateId(): string {
        return `secret_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    private startRotationCheck(): void {
        this.rotationCheckTimer = setInterval(() => {
            const needsRotation = this.getSecretsNeedingRotation();
            if (needsRotation.length > 0) {
                this.emit('secrets:rotation_needed', needsRotation);
            }

            const expiring = this.getExpiringSecrets(7);
            if (expiring.length > 0) {
                this.emit('secrets:expiring_soon', expiring);
            }
        }, 24 * 60 * 60 * 1000);
    }

    shutdown(): void {
        if (this.rotationCheckTimer) {
            clearInterval(this.rotationCheckTimer);
        }
        this.emit('shutdown');
    }
}

let secretServiceInstance: SecretService | null = null;

export function getSecretService(config?: Partial<SecretConfig>): SecretService {
    if (!secretServiceInstance) {
        secretServiceInstance = new SecretService(config);
    }
    return secretServiceInstance;
}

export function resetSecretService(): void {
    if (secretServiceInstance) {
        secretServiceInstance.shutdown();
        secretServiceInstance = null;
    }
}
