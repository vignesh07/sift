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
  const instance = new Database(dbPath);
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
