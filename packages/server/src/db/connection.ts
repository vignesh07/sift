import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getDbPath } from '../config.js';
import { applySchema } from './schema.js';

let db: Database.Database | null = null;

export function getDb(dbPath?: string): Database.Database {
  if (db) return db;
  db = createDb(dbPath ?? getDbPath());
  return db;
}

export function createDb(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  let instance: Database.Database;

  try {
    instance = new Database(dbPath);
  } catch (error) {
    throw decorateDatabaseError(error);
  }

  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  instance.pragma('busy_timeout = 5000');
  applySchema(instance);
  return instance;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function decorateDatabaseError(error: unknown): Error {
  if (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_DLOPEN_FAILED' &&
    /better_sqlite3\.node/.test(error.message)
  ) {
    const arch = process.arch === 'x64' ? 'x86_64' : process.arch;
    const message = [
      'Failed to load better-sqlite3 for the current Node architecture.',
      `Current Node arch: ${arch}`,
      'This usually means dependencies were installed under a different macOS architecture (native vs Rosetta).',
      'Fix:',
      '1. Run `node -p process.arch` to confirm the architecture you use to launch Sift.',
      '2. Rebuild the native addon under that same architecture with `npm run rebuild:native`.',
      '3. Start Sift again from the same terminal architecture.',
    ].join('\n');

    const decorated = new Error(message);
    decorated.cause = error;
    return decorated;
  }

  return error instanceof Error ? error : new Error(String(error));
}
