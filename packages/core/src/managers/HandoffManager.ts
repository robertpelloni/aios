import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { MemoryManager } from './MemoryManager.js';

export interface Handoff {
    id: string;
    timestamp: number;
    description: string;
    context: any; // Serialized state
}

/**
 * Manages session handoffs.
 * Saves the current state (memory, active profile, recent tool calls) to a file
 * that can be picked up by another agent or CLI session.
 */
export class HandoffManager extends EventEmitter {
    private handoffDir: string;

    constructor(rootDir: string, private memoryManager: MemoryManager) {
        super();
        this.handoffDir = path.join(rootDir, 'handoffs');
        this.ensureDir();
    }

    private ensureDir() {
        if (!fs.existsSync(this.handoffDir)) {
            fs.mkdirSync(this.handoffDir, { recursive: true });
        }
    }

    /**
     * Creates a handoff file from the current state.
     */
    async createHandoff(description: string, additionalContext: any = {}): Promise<string> {
        const id = `handoff-${Date.now()}`;
        const filename = path.join(this.handoffDir, `${id}.json`);

        // Gather state
        // In a real system, we'd query the AgentManager for active state, etc.
        const state: Handoff = {
            id,
            timestamp: Date.now(),
            description,
            context: {
                memory: "referenced-by-persistence", // Memory is persistent anyway
                additional: additionalContext
            }
        };

        fs.writeFileSync(filename, JSON.stringify(state, null, 2));
        this.emit('handoffCreated', state);
        console.log(`[HandoffManager] Created handoff: ${id}`);
        return id;
    }

    getHandoffs(): Handoff[] {
        if (!fs.existsSync(this.handoffDir)) return [];
        return fs.readdirSync(this.handoffDir)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                try {
                    return JSON.parse(fs.readFileSync(path.join(this.handoffDir, f), 'utf-8'));
                } catch {
                    return null;
                }
            })
            .filter(Boolean) as Handoff[];
    }
}
