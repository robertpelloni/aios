/**
 * @module services/SecretService
 */
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
const DEFAULT_CONFIG = {
    encryptionKey: crypto.randomBytes(32).toString('hex'),
    algorithm: 'aes-256-gcm',
    maxAccessLogEntries: 100,
    defaultRotationDays: 90,
    auditAllAccess: true,
};
export class SecretService extends EventEmitter {
    config;
    secrets = new Map();
    encryptionKey;
    rotationCheckTimer;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.encryptionKey = Buffer.from(this.config.encryptionKey, 'hex');
        this.startRotationCheck();
    }
    async createSecret(params) {
        const existingByName = this.findByName(params.name, params.scope, params.scopeId);
        if (existingByName) {
            throw new Error(`Secret with name '${params.name}' already exists in this scope`);
        }
        const { encrypted, iv } = this.encrypt(params.value);
        const secret = {
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
    async getSecret(secretId, actorId, actorType = 'user') {
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
    async getSecretByName(name, scope, scopeId, actorId, actorType = 'user') {
        const secret = this.findByName(name, scope, scopeId);
        if (!secret)
            return null;
        return this.getSecret(secret.id, actorId, actorType);
    }
    async updateSecret(secretId, value, actorId) {
        const secret = this.secrets.get(secretId);
        if (!secret)
            return null;
        const { encrypted, iv } = this.encrypt(value);
        secret.encryptedValue = encrypted;
        secret.iv = iv;
        secret.version++;
        secret.updatedAt = new Date();
        this.logAccess(secret, actorId, 'user', 'write', true);
        this.emit('secret:updated', this.sanitizeSecret(secret));
        return this.sanitizeSecret(secret);
    }
    async rotateSecret(secretId, newValue, actorId) {
        const secret = this.secrets.get(secretId);
        if (!secret)
            return null;
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
    async deleteSecret(secretId, actorId) {
        const secret = this.secrets.get(secretId);
        if (!secret)
            return false;
        this.logAccess(secret, actorId, 'user', 'delete', true);
        this.secrets.delete(secretId);
        this.emit('secret:deleted', { secretId, actorId });
        return true;
    }
    listSecrets(options = {}) {
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
            secrets = secrets.filter(s => options.tags.some(t => s.tags?.includes(t)));
        }
        if (!options.includeExpired) {
            const now = new Date();
            secrets = secrets.filter(s => !s.expiresAt || s.expiresAt > now);
        }
        return secrets.map(s => this.sanitizeSecret(s));
    }
    getSecretMetadata(secretId) {
        const secret = this.secrets.get(secretId);
        if (!secret)
            return null;
        return this.sanitizeSecret(secret);
    }
    getAccessLog(secretId, limit = 50) {
        const secret = this.secrets.get(secretId);
        if (!secret)
            return [];
        return secret.accessLog.slice(-limit);
    }
    getExpiringSecrets(withinDays = 30) {
        const threshold = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
        const now = new Date();
        return Array.from(this.secrets.values())
            .filter(s => s.expiresAt && s.expiresAt > now && s.expiresAt <= threshold)
            .map(s => this.sanitizeSecret(s));
    }
    getSecretsNeedingRotation() {
        const now = new Date();
        return Array.from(this.secrets.values())
            .filter(s => {
            if (!s.rotationPolicy?.enabled)
                return false;
            const lastRotation = s.lastRotated || s.createdAt;
            const nextRotation = new Date(lastRotation.getTime() + s.rotationPolicy.intervalDays * 24 * 60 * 60 * 1000);
            return nextRotation <= now;
        })
            .map(s => this.sanitizeSecret(s));
    }
    async bulkResolve(refs, actorId, actorType = 'service') {
        const results = new Map();
        for (const ref of refs) {
            const value = await this.getSecret(ref.secretId, actorId, actorType);
            results.set(ref.secretId, value);
        }
        return results;
    }
    async resolveEnvVars(scope, scopeId, actorId) {
        const secrets = this.listSecrets({ scope, scopeId, type: 'env_var' });
        const env = {};
        for (const secret of secrets) {
            const value = await this.getSecret(secret.id, actorId, 'service');
            if (value) {
                env[secret.name] = value;
            }
        }
        return env;
    }
    encrypt(plaintext) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.config.algorithm, this.encryptionKey, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            encrypted: encrypted + ':' + authTag.toString('hex'),
            iv: iv.toString('hex'),
        };
    }
    decrypt(encryptedData, ivHex) {
        const [encrypted, authTagHex] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(this.config.algorithm, this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    findByName(name, scope, scopeId) {
        return Array.from(this.secrets.values()).find(s => s.name === name && s.scope === scope && s.scopeId === scopeId);
    }
    logAccess(secret, actorId, actorType, action, success, reason) {
        if (!this.config.auditAllAccess && action === 'read' && success)
            return;
        const log = {
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
    sanitizeSecret(secret) {
        const { encryptedValue, iv, ...safe } = secret;
        return safe;
    }
    generateId() {
        return `secret_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }
    startRotationCheck() {
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
    shutdown() {
        if (this.rotationCheckTimer) {
            clearInterval(this.rotationCheckTimer);
        }
        this.emit('shutdown');
    }
}
let secretServiceInstance = null;
export function getSecretService(config) {
    if (!secretServiceInstance) {
        secretServiceInstance = new SecretService(config);
    }
    return secretServiceInstance;
}
export function resetSecretService() {
    if (secretServiceInstance) {
        secretServiceInstance.shutdown();
        secretServiceInstance = null;
    }
}
