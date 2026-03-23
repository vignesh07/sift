import type Database from 'better-sqlite3';

export interface ItemRow {
  id: string;
  type: string;
  state: string;
  title: string;
  url: string;
  number: number;
  repo_owner: string;
  repo_name: string;
  author_login: string;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
  reaction_count: number;
  participant_count: number;
  labels: string;
  notification_reason: string | null;
  notification_id: string | null;
  is_read: number;
  layer: number;
  layer_reasons: string;
  is_draft: number | null;
  review_decision: string | null;
  additions: number | null;
  deletions: number | null;
  synced_at: string;
}

export interface ItemFilter {
  layer?: number;
  type?: 'pr' | 'issue';
  state?: 'open' | 'closed' | 'merged';
  sort?: 'updated_at' | 'created_at' | 'comment_count' | 'reaction_count';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function upsertItem(db: Database.Database, item: Omit<ItemRow, 'synced_at'>): void {
  db.prepare(`
    INSERT INTO items (
      id, type, state, title, url, number,
      repo_owner, repo_name, author_login, author_avatar,
      created_at, updated_at,
      comment_count, reaction_count, participant_count,
      labels, notification_reason, notification_id, is_read,
      layer, layer_reasons,
      is_draft, review_decision, additions, deletions
    ) VALUES (
      @id, @type, @state, @title, @url, @number,
      @repo_owner, @repo_name, @author_login, @author_avatar,
      @created_at, @updated_at,
      @comment_count, @reaction_count, @participant_count,
      @labels, @notification_reason, @notification_id, @is_read,
      @layer, @layer_reasons,
      @is_draft, @review_decision, @additions, @deletions
    ) ON CONFLICT(id) DO UPDATE SET
      state = excluded.state,
      title = excluded.title,
      url = excluded.url,
      updated_at = excluded.updated_at,
      comment_count = excluded.comment_count,
      reaction_count = excluded.reaction_count,
      participant_count = excluded.participant_count,
      labels = excluded.labels,
      notification_reason = COALESCE(excluded.notification_reason, items.notification_reason),
      notification_id = COALESCE(excluded.notification_id, items.notification_id),
      is_read = excluded.is_read,
      layer = MIN(excluded.layer, items.layer),
      layer_reasons = CASE
        WHEN excluded.layer < items.layer THEN excluded.layer_reasons
        WHEN excluded.layer = items.layer THEN excluded.layer_reasons
        ELSE items.layer_reasons
      END,
      is_draft = COALESCE(excluded.is_draft, items.is_draft),
      review_decision = COALESCE(excluded.review_decision, items.review_decision),
      additions = COALESCE(excluded.additions, items.additions),
      deletions = COALESCE(excluded.deletions, items.deletions),
      synced_at = datetime('now')
  `).run(item);
}

export function upsertItems(db: Database.Database, items: Omit<ItemRow, 'synced_at'>[]): void {
  const tx = db.transaction(() => {
    for (const item of items) {
      upsertItem(db, item);
    }
  });
  tx();
}

export function queryItems(db: Database.Database, filter: ItemFilter = {}): { items: ItemRow[]; total: number } {
  const {
    layer,
    type,
    state,
    sort = 'updated_at',
    order = 'desc',
    page = 1,
    limit = 50,
  } = filter;

  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (layer !== undefined) {
    conditions.push('layer = @layer');
    params.layer = layer;
  }
  if (type) {
    conditions.push('type = @type');
    params.type = type;
  }
  if (state) {
    conditions.push('state = @state');
    params.state = state;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const allowedSorts = ['updated_at', 'created_at', 'comment_count', 'reaction_count'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'updated_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM items ${where}`).get(params) as { count: number }).count;
  const items = db.prepare(
    `SELECT * FROM items ${where} ORDER BY ${sortCol} ${sortDir} LIMIT @limit OFFSET @offset`
  ).all({ ...params, limit, offset }) as ItemRow[];

  return { items, total };
}

export function searchItems(db: Database.Database, query: string, filter: { layer?: number; limit?: number } = {}): { items: ItemRow[]; total: number } {
  const { layer, limit = 50 } = filter;

  let sql = `
    SELECT items.* FROM items_fts
    JOIN items ON items.rowid = items_fts.rowid
    WHERE items_fts MATCH @query
  `;
  const params: Record<string, unknown> = { query, limit };

  if (layer !== undefined) {
    sql += ' AND items.layer = @layer';
    params.layer = layer;
  }

  sql += ' ORDER BY rank LIMIT @limit';

  const items = db.prepare(sql).all(params) as ItemRow[];
  return { items, total: items.length };
}

export function getItemCounts(db: Database.Database): Record<number, number> {
  const rows = db.prepare('SELECT layer, COUNT(*) as count FROM items GROUP BY layer').all() as { layer: number; count: number }[];
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of rows) {
    counts[row.layer] = row.count;
  }
  return counts;
}

export function getSyncState(db: Database.Database, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM sync_state WHERE key = @key').get({ key }) as { value: string } | undefined;
  return row?.value;
}

export function setSyncState(db: Database.Database, key: string, value: string): void {
  db.prepare(`
    INSERT INTO sync_state (key, value, updated_at)
    VALUES (@key, @value, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run({ key, value });
}

export function upsertFollowing(db: Database.Database, logins: string[]): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM following').run();
    const stmt = db.prepare('INSERT INTO following (login) VALUES (@login)');
    for (const login of logins) {
      stmt.run({ login });
    }
  });
  tx();
}

export function getFollowing(db: Database.Database): string[] {
  return (db.prepare('SELECT login FROM following').all() as { login: string }[]).map(r => r.login);
}

export function upsertStarredRepos(db: Database.Database, repos: { owner: string; name: string }[]): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM starred_repos').run();
    const stmt = db.prepare('INSERT INTO starred_repos (owner, name) VALUES (@owner, @name)');
    for (const repo of repos) {
      stmt.run(repo);
    }
  });
  tx();
}

export function getStarredRepos(db: Database.Database): { owner: string; name: string }[] {
  return db.prepare('SELECT owner, name FROM starred_repos').all() as { owner: string; name: string }[];
}

export function upsertUserRepos(db: Database.Database, repos: { owner: string; name: string; is_owner: boolean }[]): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_repos').run();
    const stmt = db.prepare('INSERT INTO user_repos (owner, name, is_owner) VALUES (@owner, @name, @is_owner)');
    for (const repo of repos) {
      stmt.run({ ...repo, is_owner: repo.is_owner ? 1 : 0 });
    }
  });
  tx();
}

export function getUserRepos(db: Database.Database): { owner: string; name: string; is_owner: boolean }[] {
  return (db.prepare('SELECT owner, name, is_owner FROM user_repos').all() as { owner: string; name: string; is_owner: number }[])
    .map(r => ({ ...r, is_owner: r.is_owner === 1 }));
}

export function upsertRepoCollaborators(db: Database.Database, repoOwner: string, repoName: string, logins: string[]): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM repo_collaborators WHERE repo_owner = @repoOwner AND repo_name = @repoName').run({ repoOwner, repoName });
    const stmt = db.prepare('INSERT INTO repo_collaborators (repo_owner, repo_name, login) VALUES (@repoOwner, @repoName, @login)');
    for (const login of logins) {
      stmt.run({ repoOwner, repoName, login });
    }
  });
  tx();
}

export function getRepoCollaborators(db: Database.Database): { repo: string; login: string }[] {
  return (db.prepare('SELECT repo_owner, repo_name, login FROM repo_collaborators').all() as { repo_owner: string; repo_name: string; login: string }[])
    .map(r => ({ repo: `${r.repo_owner}/${r.repo_name}`, login: r.login }));
}

export function upsertReviewRequests(db: Database.Database, itemId: string, reviewers: string[]): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM review_requests WHERE item_id = @itemId').run({ itemId });
    const stmt = db.prepare('INSERT INTO review_requests (item_id, reviewer_login) VALUES (@itemId, @login)');
    for (const login of reviewers) {
      stmt.run({ itemId, login });
    }
  });
  tx();
}
