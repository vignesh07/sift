import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { getDb, closeDb } from './db/connection.js';
import { readConfig } from './config.js';
import { createOctokit, createGraphQL } from './github/client.js';
import { runSync } from './github/sync.js';

const PORT = 4185;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const db = getDb();
  const app = createApp(db);

  // Serve static frontend in production (when built)
  const webDistDir = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDistDir)) {
    app.use('/assets/*', serveStatic({ root: webDistDir }));
    // SPA fallback: serve index.html for non-API routes
    app.get('*', (c) => {
      if (c.req.path.startsWith('/api')) {
        return c.json({ error: 'Not found' }, 404);
      }
      const html = fs.readFileSync(path.join(webDistDir, 'index.html'), 'utf-8');
      return c.html(html);
    });
  }

  // Start server
  serve({ fetch: app.fetch, port: PORT, hostname: '127.0.0.1' }, (info) => {
    console.log(`Sift running at http://127.0.0.1:${info.port}`);
  });

  // Background sync on startup if token is configured
  const config = readConfig();
  if (config.token && config.username) {
    console.log('Starting initial sync...');
    const octokit = createOctokit(config.token);
    const gql = createGraphQL(config.token);
    runSync(db, octokit, gql, config.username)
      .then(result => console.log(`Sync complete: ${result.itemsSynced} items`))
      .catch(err => console.error('Sync failed:', err));
  }

  // Open browser
  try {
    const open = (await import('open')).default;
    await open(`http://127.0.0.1:${PORT}`);
  } catch {
    // Silently fail — user can open manually
  }

  // Periodic sync every 5 minutes
  const syncInterval = setInterval(async () => {
    const cfg = readConfig();
    if (cfg.token && cfg.username) {
      try {
        const octokit = createOctokit(cfg.token);
        const gql = createGraphQL(cfg.token);
        await runSync(db, octokit, gql, cfg.username);
      } catch (err) {
        console.error('Periodic sync failed:', err);
      }
    }
  }, 5 * 60 * 1000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(syncInterval);
    closeDb();
    process.exit(0);
  });
}

main().catch(console.error);
