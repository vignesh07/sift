import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type { ConfigGetter } from '../app.js';
import { createOctokit, createGraphQL } from '../github/client.js';
import { runSync } from '../github/sync.js';

export function syncRoutes(db: Database.Database, getConfig: ConfigGetter): Hono {
  const app = new Hono();

  app.post('/api/sync', async (c) => {
    const config = getConfig();
    if (!config.token) {
      return c.json({ error: 'No token configured' }, 401);
    }

    const octokit = createOctokit(config.token);
    const gql = createGraphQL(config.token);

    const result = await runSync(db, octokit, gql, config.username!);
    return c.json(result);
  });

  return app;
}
