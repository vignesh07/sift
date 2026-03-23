import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { queryItems, searchItems } from '../db/queries.js';

export function itemRoutes(db: Database.Database): Hono {
  const app = new Hono();

  app.get('/api/items', (c) => {
    const layer = c.req.query('layer') ? Number(c.req.query('layer')) : undefined;
    const type = c.req.query('type') as 'pr' | 'issue' | undefined;
    const state = c.req.query('state') as 'open' | 'closed' | 'merged' | undefined;
    const sort = (c.req.query('sort') ?? 'updated_at') as any;
    const order = (c.req.query('order') ?? 'desc') as 'asc' | 'desc';
    const page = c.req.query('page') ? Number(c.req.query('page')) : 1;
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 50;

    const result = queryItems(db, { layer, type, state, sort, order, page, limit });
    return c.json(result);
  });

  app.get('/api/items/search', (c) => {
    const q = c.req.query('q');
    if (!q) {
      return c.json({ items: [], total: 0 });
    }

    const layer = c.req.query('layer') ? Number(c.req.query('layer')) : undefined;
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 50;

    const result = searchItems(db, q, { layer, limit });
    return c.json(result);
  });

  app.get('/api/feed', (c) => {
    const page = c.req.query('page') ? Number(c.req.query('page')) : 1;
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 50;

    const result = queryItems(db, { sort: 'updated_at', order: 'desc', page, limit });
    return c.json(result);
  });

  return app;
}
