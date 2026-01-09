import type { Context } from 'hono';
import { SecretManager } from '../managers/SecretManager.js';

interface SocketWithAuth {
    handshake: {
        auth?: { token?: string };
        query?: { token?: string };
    };
}

export class AuthMiddleware {
    constructor(private secretManager: SecretManager) {}

    async verifyHono(c: Context): Promise<{ valid: boolean }> {
        const token = this.extractTokenFromHono(c);
        const expected = this.secretManager.getSecret('SUPER_AI_TOKEN') || 'dev-token';
        return { valid: token === expected };
    }

    verifySocket(socket: SocketWithAuth, next: (err?: Error) => void) {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        const expected = this.secretManager.getSecret('SUPER_AI_TOKEN') || 'dev-token';

        if (token === expected) {
            next();
        } else {
            next(new Error('Unauthorized'));
        }
    }

    private extractTokenFromHono(c: Context): string | null {
        const authHeader = c.req.header('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return c.req.query('token') || null;
    }
}
