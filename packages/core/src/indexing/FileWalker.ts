
import fg from 'fast-glob';
import path from 'path';

export class FileWalker {
    constructor(private rootDir: string) { }

    async getFiles(patterns: string[] = ['**/*']): Promise<string[]> {
        const entries = await fg(patterns, {
            cwd: this.rootDir,
            absolute: true,
            ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
            stats: false,
        });
        return entries;
    }
}
