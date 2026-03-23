import { Hono } from 'hono';
import { readConfig, writeConfig } from '../config.js';
import { validateToken } from '../github/client.js';

export function setupRoutes(): Hono {
  const app = new Hono();

  app.post('/api/setup', async (c) => {
    const body = await c.req.json<{ token: string }>();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return c.json({ error: 'Token is required' }, 400);
    }

    const result = await validateToken(token.trim());
    if (!result.valid) {
      return c.json({ error: 'Invalid token. Check scopes: notifications, read:user, repo' }, 400);
    }

    const config = readConfig();
    config.token = token.trim();
    config.username = result.login;
    writeConfig(config);

    return c.json({ success: true, username: result.login });
  });

  return app;
}
