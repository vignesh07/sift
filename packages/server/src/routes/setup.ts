import { Hono } from 'hono';
import { storeToken, writeConfig } from '../config.js';
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

    if (result.scopesVerified && result.missingScopes.length > 0) {
      return c.json({
        error: `Token is missing scopes: ${result.missingScopes.join(', ')}`,
      }, 400);
    }

    const tokenStorage = storeToken(token.trim());
    writeConfig({
      username: result.login,
      token: tokenStorage === 'config' ? token.trim() : undefined,
      tokenStorage,
    });

    return c.json({
      success: true,
      username: result.login,
      tokenStorage,
      scopesVerified: result.scopesVerified,
    });
  });

  return app;
}
