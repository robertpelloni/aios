import { MemoryProvider, MemoryItem, MemoryResult } from '../../interfaces/MemoryProvider.js';
import { BrowserManager } from '../BrowserManager.js';

export class BrowserStorageProvider implements MemoryProvider {
    id = 'browser-storage';
    name = 'Browser History & Bookmarks';
    type: 'external' = 'external';
    capabilities: ('read' | 'write' | 'search' | 'delete')[] = ['search', 'read'];

    constructor(private browserManager: BrowserManager) {}

    async connect(): Promise<void> {
        // Connection is managed by BrowserManager socket
        if (!this.browserManager.isConnected()) {
            console.warn('[BrowserStorageProvider] Browser not connected yet.');
        }
    }

    async disconnect(): Promise<void> {
        // Nothing to do
    }

    async insert(item: MemoryItem): Promise<string> {
        // Browser history is read-only for now
        console.warn('[BrowserStorageProvider] Insert not supported (Read-Only)');
        return "";
    }

    async search(query: string): Promise<MemoryResult[]> {
        if (!this.browserManager.isConnected()) {
            return [];
        }

        try {
            const history = await this.browserManager.searchHistory(query, 5);
            const bookmarks = await this.browserManager.getBookmarks(query);

            const results: MemoryResult[] = [];

            // Map History
            results.push(...history.map((h: any) => ({
                id: `history-${h.id}`,
                content: `[Browser History] ${h.title} - ${h.url}`,
                tags: ['browser', 'history'],
                timestamp: h.lastVisitTime || Date.now(),
                sourceProvider: this.id,
                metadata: {
                    url: h.url,
                    visitCount: h.visitCount,
                    source: 'browser-history'
                }
            })));

            // Map Bookmarks
            results.push(...bookmarks.map((b: any) => ({
                id: `bookmark-${b.id}`,
                content: `[Browser Bookmark] ${b.title} - ${b.url}`,
                tags: ['browser', 'bookmark'],
                timestamp: b.dateAdded || Date.now(),
                sourceProvider: this.id,
                metadata: {
                    url: b.url,
                    source: 'browser-bookmark'
                }
            })));

            return results;

        } catch (e) {
            console.error('[BrowserStorageProvider] Search failed:', e);
            return [];
        }
    }

    async delete(id: string): Promise<void> {
        // Not supported
    }

    async clear(): Promise<void> {
        // Not supported
    }
}
