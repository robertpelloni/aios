
import fs from 'fs';
import path from 'path';

export interface AuditEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    agentId?: string;
    event: string;
    details?: any;
    metadata?: any;
}

export class AuditService {
    private logPath: string;

    constructor(cwd: string) {
        const auditDir = path.join(cwd, '.borg', 'audit');
        if (!fs.existsSync(auditDir)) {
            // Ensure .borg exists first
            if (!fs.existsSync(path.join(cwd, '.borg'))) {
                fs.mkdirSync(path.join(cwd, '.borg'));
            }
            fs.mkdirSync(auditDir);
        }
        // Rotate inputs? For MVP, single file.
        this.logPath = path.join(auditDir, 'audit.jsonl');
    }

    log(event: string, details?: any, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
        const entry: AuditEntry = {
            timestamp: new Date().toISOString(),
            level,
            event,
            details,
        };

        const line = JSON.stringify(entry) + '\n';
        try {
            fs.appendFileSync(this.logPath, line, 'utf-8');
        } catch (e) {
            console.error("[AuditService] Failed to write log:", e);
        }
    }
}
