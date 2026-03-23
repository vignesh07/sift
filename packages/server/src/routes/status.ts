import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type { ConfigGetter } from '../app.js';
import { getItemCounts, getSyncState } from '../db/queries.js';
import { isSyncInProgress } from '../github/sync.js';

export function statusRoutes(db: Database.Database, getConfig: ConfigGetter): Hono {
  const app = new Hono();

  app.get('/api/status', (c) => {
    const config = getConfig();
    const needsToken = !config.token;
    const lastSync = getSyncState(db, 'last_sync') ?? null;
    const itemCounts = needsToken ? { 1: 0, 2: 0, 3: 0, 4: 0 } : getItemCounts(db);

    return c.json({
      needsToken,
      user: config.username ?? null,
      lastSync,
      syncInProgress: isSyncInProgress(),
      itemCounts,
    });
  });

  return app;
}
