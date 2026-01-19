import { describe, test, expect } from 'bun:test';
import path from 'path';
import os from 'os';
import { mkdtempSync, rmSync } from 'fs';
import { DatabaseManager } from '../src/db/DatabaseManager.js';
import { ToolAnnotationManager } from '../src/managers/ToolAnnotationManager.js';

describe('ToolAnnotationManager persistence', () => {
  test('writes and reads from DB when available', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'aios-ann-db-'));

    let db: DatabaseManager;
    try {
      db = DatabaseManager.getInstance(dir);
    } catch {
      rmSync(dir, { recursive: true, force: true });
      return;
    }

    const mgr = new ToolAnnotationManager();
    mgr.setDatabase(db as any);

    mgr.setAnnotation('srv', 'tool', { namespaceId: 'ns', displayName: 'x' });

    const mgr2 = new ToolAnnotationManager();
    mgr2.setDatabase(db as any);

    const read = mgr2.getAnnotation('srv', 'tool', 'ns');
    expect(read?.displayName).toBe('x');

    rmSync(dir, { recursive: true, force: true });
  });
});
