import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../src/db/connection.js';
import {
  buildFtsQuery,
  upsertItem,
  upsertItems,
  queryItems,
  searchItems,
  getItemCounts,
  getSyncState,
  setSyncState,
  upsertFollowing,
  getFollowing,
  upsertStarredRepos,
  getStarredRepos,
  upsertUserRepos,
  getUserRepos,
} from '../src/db/queries.js';
import type Database from 'better-sqlite3';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'node-1',
    type: 'pr',
    state: 'open',
    title: 'Fix bug in parser',
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
    labels: '["bug","p1"]',
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

beforeEach(() => {
  db = createDb(':memory:');
});

afterEach(() => {
  db.close();
});

describe('items', () => {
  it('inserts and queries an item', () => {
    upsertItem(db, makeRow());
    const result = queryItems(db);
    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe('Fix bug in parser');
  });

  it('upserts (updates on conflict)', () => {
    upsertItem(db, makeRow());
    upsertItem(db, makeRow({ title: 'Updated title', layer: 2 }));
    const result = queryItems(db);
    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe('Updated title');
  });

  it('latest sync classification wins on conflict', () => {
    upsertItem(db, makeRow({ layer: 1, layer_reasons: '["review_requested"]' }));
    upsertItem(db, makeRow({ layer: 3, layer_reasons: '["high_comments"]' }));
    const result = queryItems(db);
    expect(result.items[0].layer).toBe(3);
    expect(result.items[0].layer_reasons).toBe('["high_comments"]');
  });

  it('bulk upserts in transaction', () => {
    const items = [
      makeRow({ id: 'n1', title: 'First' }),
      makeRow({ id: 'n2', title: 'Second' }),
      makeRow({ id: 'n3', title: 'Third' }),
    ];
    upsertItems(db, items);
    const result = queryItems(db);
    expect(result.total).toBe(3);
  });

  it('filters by layer', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', layer: 1 }),
      makeRow({ id: 'n2', layer: 2 }),
      makeRow({ id: 'n3', layer: 4 }),
    ]);
    const result = queryItems(db, { layer: 1 });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('n1');
  });

  it('filters by type and state', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', type: 'pr', state: 'open' }),
      makeRow({ id: 'n2', type: 'issue', state: 'open' }),
      makeRow({ id: 'n3', type: 'pr', state: 'closed' }),
    ]);
    const result = queryItems(db, { type: 'pr', state: 'open' });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('n1');
  });

  it('filters by sync recency', () => {
    upsertItems(db, [
      makeRow({ id: 'n1' }),
      makeRow({ id: 'n2' }),
    ]);
    db.prepare("UPDATE items SET synced_at = '2024-01-01 00:00:00' WHERE id = 'n1'").run();
    db.prepare("UPDATE items SET synced_at = '2024-01-03 00:00:00' WHERE id = 'n2'").run();

    const result = queryItems(db, { syncedSince: '2024-01-02T00:00:00Z' });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('n2');
  });

  it('paginates', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeRow({ id: `n${i}`, updated_at: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` })
    );
    upsertItems(db, items);

    const page1 = queryItems(db, { limit: 3, page: 1, sort: 'updated_at', order: 'desc' });
    expect(page1.total).toBe(10);
    expect(page1.items.length).toBe(3);
    expect(page1.items[0].id).toBe('n9');

    const page2 = queryItems(db, { limit: 3, page: 2, sort: 'updated_at', order: 'desc' });
    expect(page2.items.length).toBe(3);
    expect(page2.items[0].id).toBe('n6');
  });
});

describe('FTS search', () => {
  it('searches by title', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', title: 'Fix memory leak in parser' }),
      makeRow({ id: 'n2', title: 'Add new feature' }),
    ]);
    const result = searchItems(db, 'memory');
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('n1');
  });

  it('searches by author', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', author_login: 'alice' }),
      makeRow({ id: 'n2', author_login: 'bob' }),
    ]);
    const result = searchItems(db, 'bob');
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('n2');
  });

  it('searches by repo', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', repo_owner: 'facebook', repo_name: 'react' }),
      makeRow({ id: 'n2', repo_owner: 'vuejs', repo_name: 'vue' }),
    ]);
    const result = searchItems(db, 'react');
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('n1');
  });

  it('filters search by layer', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', title: 'Fix bug', layer: 1 }),
      makeRow({ id: 'n2', title: 'Fix another bug', layer: 3 }),
    ]);
    const result = searchItems(db, 'Fix', { layer: 1 });
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('n1');
  });

  it('sanitizes punctuation-heavy searches', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', title: 'foo bar baz' }),
    ]);
    const result = searchItems(db, 'foo-bar');
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('n1');
  });

  it('reports the total search matches separately from the current limit', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', title: 'parser bug one' }),
      makeRow({ id: 'n2', title: 'parser bug two' }),
    ]);
    const result = searchItems(db, 'parser', { limit: 1 });
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(2);
  });

  it('filters search by sync recency', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', title: 'parser bug one' }),
      makeRow({ id: 'n2', title: 'parser bug two' }),
    ]);
    db.prepare("UPDATE items SET synced_at = '2024-01-01 00:00:00' WHERE id = 'n1'").run();
    db.prepare("UPDATE items SET synced_at = '2024-01-03 00:00:00' WHERE id = 'n2'").run();

    const result = searchItems(db, 'parser', { syncedSince: '2024-01-02T00:00:00Z' });
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('n2');
  });
});

describe('buildFtsQuery', () => {
  it('returns null for punctuation-only input', () => {
    expect(buildFtsQuery('"""')).toBeNull();
  });

  it('converts free-form input into a prefix query', () => {
    expect(buildFtsQuery('foo-bar baz')).toBe('foo* bar* baz*');
  });
});

describe('item counts', () => {
  it('counts by layer', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', layer: 1 }),
      makeRow({ id: 'n2', layer: 1 }),
      makeRow({ id: 'n3', layer: 2 }),
      makeRow({ id: 'n4', layer: 4 }),
    ]);
    const counts = getItemCounts(db);
    expect(counts).toEqual({ 1: 2, 2: 1, 3: 0, 4: 1, 5: 0 });
  });

  it('can count only open items', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', layer: 1, state: 'open' }),
      makeRow({ id: 'n2', layer: 1, state: 'closed' }),
      makeRow({ id: 'n3', layer: 2, state: 'open' }),
      makeRow({ id: 'n4', layer: 4, state: 'merged' }),
    ]);
    const counts = getItemCounts(db, { state: 'open' });
    expect(counts).toEqual({ 1: 1, 2: 1, 3: 0, 4: 0, 5: 0 });
  });

  it('can count only recently synced items', () => {
    upsertItems(db, [
      makeRow({ id: 'n1', layer: 1 }),
      makeRow({ id: 'n2', layer: 2 }),
    ]);
    db.prepare("UPDATE items SET synced_at = '2024-01-01 00:00:00' WHERE id = 'n1'").run();
    db.prepare("UPDATE items SET synced_at = '2024-01-03 00:00:00' WHERE id = 'n2'").run();

    const counts = getItemCounts(db, { syncedSince: '2024-01-02T00:00:00Z' });
    expect(counts).toEqual({ 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 });
  });
});

describe('sync state', () => {
  it('stores and retrieves key-value', () => {
    setSyncState(db, 'last_sync', '2024-01-01');
    expect(getSyncState(db, 'last_sync')).toBe('2024-01-01');
  });

  it('returns undefined for missing key', () => {
    expect(getSyncState(db, 'nonexistent')).toBeUndefined();
  });

  it('updates existing key', () => {
    setSyncState(db, 'key', 'v1');
    setSyncState(db, 'key', 'v2');
    expect(getSyncState(db, 'key')).toBe('v2');
  });
});

describe('social tables', () => {
  it('following: upserts and retrieves', () => {
    upsertFollowing(db, ['alice', 'bob', 'charlie']);
    expect(getFollowing(db)).toEqual(['alice', 'bob', 'charlie']);
  });

  it('following: replaces on re-upsert', () => {
    upsertFollowing(db, ['alice', 'bob']);
    upsertFollowing(db, ['charlie']);
    expect(getFollowing(db)).toEqual(['charlie']);
  });

  it('starred repos: upserts and retrieves', () => {
    upsertStarredRepos(db, [{ owner: 'org', name: 'repo' }]);
    expect(getStarredRepos(db)).toEqual([{ owner: 'org', name: 'repo' }]);
  });

  it('user repos: tracks is_owner and permission', () => {
    upsertUserRepos(db, [
      { owner: 'me', name: 'my-lib', is_owner: true, permission: 'ADMIN' },
      { owner: 'org', name: 'shared', is_owner: false, permission: 'WRITE' },
    ]);
    const repos = getUserRepos(db);
    expect(repos).toEqual([
      { owner: 'me', name: 'my-lib', is_owner: true, permission: 'ADMIN' },
      { owner: 'org', name: 'shared', is_owner: false, permission: 'WRITE' },
    ]);
  });
});
