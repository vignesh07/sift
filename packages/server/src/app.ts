import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type Database from 'better-sqlite3';
import { statusRoutes } from './routes/status.js';
import { itemRoutes } from './routes/items.js';
import { syncRoutes } from './routes/sync.js';
import { setupRoutes } from './routes/setup.js';

export function createApp(db: Database.Database): Hono {
  const app = new Hono();

  // Middleware
  app.use('*', cors({ origin: '*' }));

  // Error handler
  app.onError((err, c) => {
    console.error('Server error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  });

  // Routes
  app.route('/', statusRoutes(db));
  app.route('/', itemRoutes(db));
  app.route('/', syncRoutes(db));
  app.route('/', setupRoutes());

  return app;
}
