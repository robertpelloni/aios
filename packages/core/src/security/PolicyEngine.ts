
import fs from 'fs';
import path from 'path';

export interface Policy {
    mode: 'strict' | 'permissive';
    filesystem: {
        deny: string[]; // Glob patterns (e.g. "**/.env")
    };
    tools: {
        deny: string[];
    };
}

const DEFAULT_POLICY: Policy = {
    mode: 'permissive',
    filesystem: {
        deny: ['**/.env', '**/id_rsa', '**/.ssh/**']
    },
    tools: {
        deny: []
    }
};

export class PolicyEngine {
    private policy: Policy;
    private policyPath: string;

    constructor(cwd: string) {
        this.policyPath = path.join(cwd, '.borg', 'policy.json');
        this.policy = this.loadPolicy();
    }

    private loadPolicy(): Policy {
        try {
            if (fs.existsSync(this.policyPath)) {
                const raw = fs.readFileSync(this.policyPath, 'utf-8');
                return { ...DEFAULT_POLICY, ...JSON.parse(raw) };
            }
        } catch (e) {
            console.error("Failed to load policy.json", e);
        }
        return DEFAULT_POLICY;
    }

    /**
     * Check if a tool execution is allowed by policy.
     */
    check(toolName: string, args: any): { allowed: boolean; reason?: string } {
        // 1. Tool Blacklist
        if (this.policy.tools.deny.includes(toolName)) {
            return { allowed: false, reason: `Tool '${toolName}' is blacklisted by policy.` };
        }

        // 2. Filesystem Check (for fs tools)
        if (['write_to_file', 'read_file', 'list_dir', 'replace_file_content'].includes(toolName)) {
            const targetPath = args.TargetFile || args.AbsolutePath || args.DirectoryPath || args.path;
            if (targetPath) {
                // Simple glob check (implementation simplified for demo)
                // In prod, use micromatch or minimatch
                for (const pattern of this.policy.filesystem.deny) {
                    if (targetPath.includes(pattern.replace('**', ''))) {
                        return { allowed: false, reason: `Path '${targetPath}' matches deny rule '${pattern}'` };
                    }
                }
            }
        }

        return { allowed: true };
    }
}
