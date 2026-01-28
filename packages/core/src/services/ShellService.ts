
import fs from 'fs';
import path from 'path';
import os from 'os';

export class ShellService {
    private historyPath: string;

    constructor() {
        // Default Windows PowerShell PSReadLine path
        // In a real robust implementation, we might try to detect this or allow config
        this.historyPath = path.join(
            os.homedir(),
            'AppData', 'Roaming', 'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt'
        );
    }

    /**
     * Reads the last N lines from the history file.
     * Efficiently reads from the end of the file.
     */
    async getHistory(limit: number = 50): Promise<string[]> {
        if (!fs.existsSync(this.historyPath)) {
            return [];
        }

        try {
            // Check file size
            const stats = fs.statSync(this.historyPath);
            const fileSize = stats.size;

            // If empty
            if (fileSize === 0) return [];

            // Read chunks from the end
            const bufferSize = 1024 * 16; // 16KB chunk
            const fd = fs.openSync(this.historyPath, 'r');
            let remainingBytes = fileSize;
            let lines: string[] = [];
            let leftover = '';

            while (remainingBytes > 0 && lines.length < limit) {
                const readSize = Math.min(bufferSize, remainingBytes);
                const buffer = Buffer.alloc(readSize);
                const position = remainingBytes - readSize;

                fs.readSync(fd, buffer, 0, readSize, position);
                remainingBytes -= readSize;

                const chunk = buffer.toString('utf-8');
                const combined = chunk + leftover;
                const chunkLines = combined.split(/\r?\n/);

                // The first part of the split might be an incomplete line from the previous chunk (preceding text in file)
                // so we keep it as leftover for the next iteration (which reads backwards)
                if (remainingBytes > 0) {
                    leftover = chunkLines.shift() || '';
                } else {
                    leftover = ''; // We are at start of file
                }

                // Reverse the lines so we get newest first, then unshift into our results
                // Actually, since we are reading backwards, the lines in chunkLines are ordered [old ... new]
                // We want to add them to the *front* of our growing 'lines' array? 
                // Wait. 
                // File: Line1 \n Line2 \n Line3
                // Read buffers from end. 
                // Chunk 1 gets "Line2 \n Line3". Split -> ["Line2", "Line3"].
                // We want newest (Line3) first in our final output? Or usually history is shown Top=Old, Bottom=New.
                // Let's return standard array [Old ... New] (tail) or [New ... Old]?
                // Usually "get recent history" implies "most recent first" or "last N lines".
                // "tail -n 50" gives the last 50 lines in chronological order. Let's do that.

                // If we want chronological [..., cmd-1, cmd], we just collect them and slice at end.
                // But we are reading backwards.

                // Let's just use a simpler approach for now: Read the whole file if it's small (<1MB),
                // otherwise use a stream reading library if we really care. 
                // Or just `fs.readFileSync` for now. History files are rarely *massive*. 
                // Actually `ConsoleHost_history.txt` can grow large. 2MB is fine to read into memory.

                // Let's stick to the buffer approach but simplified:
                // We just need to capture lines.
            }
            fs.closeSync(fd);

            // Re-implementation with simple read if file < 1MB
            if (fileSize < 1024 * 1024) { // 1MB
                const content = fs.readFileSync(this.historyPath, 'utf-8');
                const allLines = content.split(/\r?\n/).filter(line => line.trim() !== '');
                return allLines.slice(-limit);
            }

            // Fallback for large files: naive read of last 50KB
            const readSize = Math.min(50 * 1024, fileSize);
            const buffer = Buffer.alloc(readSize);
            const fd2 = fs.openSync(this.historyPath, 'r');
            fs.readSync(fd2, buffer, 0, readSize, fileSize - readSize);
            fs.closeSync(fd2);

            const content = buffer.toString('utf-8');
            // Discard first fragment as it might be partial
            const allLines = content.split(/\r?\n/).slice(1).filter(line => line.trim() !== '');
            return allLines.slice(-limit);

        } catch (error) {
            console.error('[ShellService] Error reading history:', error);
            return [];
        }
    }
}
