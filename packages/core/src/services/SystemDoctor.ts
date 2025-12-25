import { EventEmitter } from 'events';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface SystemCheck {
    name: string;
    status: 'ok' | 'error' | 'missing';
    version?: string;
    message?: string;
}

export class SystemDoctor extends EventEmitter {

    async checkAll(): Promise<SystemCheck[]> {
        const checks: SystemCheck[] = [];

        checks.push(await this.checkCommand('node', 'node -v'));
        checks.push(await this.checkCommand('npm', 'npm -v'));
        checks.push(await this.checkCommand('git', 'git --version'));
        checks.push(await this.checkCommand('docker', 'docker -v'));
        checks.push(await this.checkCommand('python', 'python3 --version'));
        checks.push(await this.checkCommand('claude', 'claude --version')); // Claude Code

        return checks;
    }

    private async checkCommand(name: string, cmd: string): Promise<SystemCheck> {
        try {
            const { stdout } = await execAsync(cmd);
            return {
                name,
                status: 'ok',
                version: stdout.trim()
            };
        } catch (e) {
            return {
                name,
                status: 'missing',
                message: 'Command not found'
            };
        }
    }
}
