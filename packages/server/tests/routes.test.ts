import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../src/db/connection.js';
import { createApp } from '../src/app.js';
import { upsertItems } from '../src/db/queries.js';
import type Database from 'better-sqlite3';
import type { Hono } from 'hono';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'node-1',
    type: 'pr',
    state: 'open',
    title: 'Fix bug',
    url: 'https://github.com/org/repo/pull/1',
    number: 1,
    repo_owner: 'org',
    repo_name: 'repo',
    author_login: 'alice',
    author_avatar: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    comment_count: 5,
    reaction_count: 2,
    participant_count: 3,
    labels: '[]',
    notification_reason: null,
    notification_id: null,
    is_read: 0,
    layer: 2,
    layer_reasons: '["starred_repo"]',
    is_draft: 0,
    review_decision: null,
    additions: 10,
    deletions: 5,
    ...overrides,
  } as any;
}

let db: Database.Database;
let app: Hono;

beforeEach(() => {
  db = createDb(':memory:');
  app = createApp(db, () => ({}));
});

afterEach(() => {
  db.close();
});

async function req(path: string, init?: RequestInit) {
  const res = await app.request(path, init);
  return { status: res.status, body: await res.json() };
}

describe('GET /api/status', () => {
  it('returns status with no token', async () => {
    const { status, body } = await req('/api/status');
    expect(status).toBe(200);
    expect(body.needsToken).toBe(true);
    expect(body.itemCounts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });
});

describe('GET /api/items', () => {
  it('returns empty when no items', async () => {
    const { body } = await req('/api/items');
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns items', async () => {
    upsertItems(db, [makeRow()]);
    const { body } = await req('/api/items');
    expect(body.total).toBe(1);
    expect(body.items[0].title).toBe('Fix bug');
  });

  it('filters by layer', async () => {
    upsertItems(db, [
      makeRow({ id: 'n1', layer: 1 }),
      makeRow({ id: 'n2', layer: 3 }),
    ]);
    const { body } = await req('/api/items?layer=1');
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe('n1');
  });

  it('paginates', async () => {
    const items = Array.from({ length: 5 }, (_, i) => makeRow({ id: `n${i}` }));
    upsertItems(db, items);
    const { body } = await req('/api/items?limit=2&page=1');
    expect(body.items.length).toBe(2);
    expect(body.total).toBe(5);
  });
});

describe('GET /api/items/search', () => {
  it('returns empty for no query', async () => {
    const { body } = await req('/api/items/search');
    expect(body.items).toEqual([]);
  });

  it('searches items', async () => {
    upsertItems(db, [
      makeRow({ id: 'n1', title: 'Memory leak fix' }),
      makeRow({ id: 'n2', title: 'Add feature' }),
    ]);
    const { body } = await req('/api/items/search?q=memory');
    expect(body.items.length).toBe(1);
    expect(body.items[0].id).toBe('n1');
  });

  it('does not error on punctuation-heavy queries', async () => {
    upsertItems(db, [
      makeRow({ id: 'n1', title: 'foo bar' }),
    ]);
    const { status, body } = await req('/api/items/search?q=foo-bar');
    expect(status).toBe(200);
    expect(body.items.length).toBe(1);
    expect(body.items[0].id).toBe('n1');
  });
});

describe('GET /api/feed', () => {
  it('returns all items sorted by updated_at', async () => {
    upsertItems(db, [
      makeRow({ id: 'n1', layer: 1, updated_at: '2024-01-01T00:00:00Z' }),
      makeRow({ id: 'n2', layer: 3, updated_at: '2024-01-03T00:00:00Z' }),
      makeRow({ id: 'n3', layer: 2, updated_at: '2024-01-02T00:00:00Z' }),
    ]);
    const { body } = await req('/api/feed');
    expect(body.total).toBe(3);
    expect(body.items[0].id).toBe('n2');
    expect(body.items[1].id).toBe('n3');
    expect(body.items[2].id).toBe('n1');
  });
});

describe('POST /api/sync', () => {
  it('returns 401 when no token', async () => {
    const { status, body } = await req('/api/sync', { method: 'POST' });
    expect(status).toBe(401);
    expect(body.error).toBeTruthy();
  });
});

describe('POST /api/setup', () => {
  it('rejects empty token', async () => {
    const { status, body } = await req('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: '' }),
    });
    expect(status).toBe(400);
    expect(body.error).toBeTruthy();
  });
});
