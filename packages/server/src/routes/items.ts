import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { getSyncState, queryItems, searchItems } from '../db/queries.js';

function parseStateParam(raw: string | undefined): 'open' | 'closed' | 'merged' | undefined {
  if (!raw || raw === 'all') {
    return raw ? undefined : 'open';
  }

  if (raw === 'open' || raw === 'closed' || raw === 'merged') {
    return raw;
  }

  return 'open';
}

export function itemRoutes(db: Database.Database): Hono {
  const app = new Hono();

  app.get('/api/items', (c) => {
    const syncedSince = getSyncState(db, 'last_sync_started');
    const layer = c.req.query('layer') ? Number(c.req.query('layer')) : undefined;
    const type = c.req.query('type') as 'pr' | 'issue' | undefined;
    const state = parseStateParam(c.req.query('state'));
    const sort = (c.req.query('sort') ?? 'updated_at') as any;
    const order = (c.req.query('order') ?? 'desc') as 'asc' | 'desc';
    const page = c.req.query('page') ? Number(c.req.query('page')) : 1;
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 50;

    const result = queryItems(db, { layer, type, state, syncedSince, sort, order, page, limit });
    return c.json(result);
  });

  app.get('/api/items/search', (c) => {
    const syncedSince = getSyncState(db, 'last_sync_started');
    const q = c.req.query('q');
    if (!q) {
      return c.json({ items: [], total: 0 });
    }

    const layer = c.req.query('layer') ? Number(c.req.query('layer')) : undefined;
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 50;

    const result = searchItems(db, q, { layer, limit, syncedSince });
    return c.json(result);
  });

  app.get('/api/feed', (c) => {
    const syncedSince = getSyncState(db, 'last_sync_started');
    const state = parseStateParam(c.req.query('state'));
    const page = c.req.query('page') ? Number(c.req.query('page')) : 1;
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 50;

    const result = queryItems(db, { state, syncedSince, sort: 'updated_at', order: 'desc', page, limit });
    return c.json(result);
  });

  return app;
}
