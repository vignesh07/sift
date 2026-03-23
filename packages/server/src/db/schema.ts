import type Database from 'better-sqlite3';

export function applySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,           -- GitHub node ID
      type TEXT NOT NULL,            -- 'pr' | 'issue'
      state TEXT NOT NULL,           -- 'open' | 'closed' | 'merged'
      title TEXT NOT NULL,
      url TEXT NOT NULL,             -- GitHub web URL
      number INTEGER NOT NULL,
      repo_owner TEXT NOT NULL,
      repo_name TEXT NOT NULL,
      author_login TEXT NOT NULL,
      author_avatar TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      -- Engagement metrics
      comment_count INTEGER NOT NULL DEFAULT 0,
      reaction_count INTEGER NOT NULL DEFAULT 0,
      participant_count INTEGER NOT NULL DEFAULT 0,
      -- Labels as JSON array
      labels TEXT NOT NULL DEFAULT '[]',
      -- Notification metadata
      notification_reason TEXT,       -- 'review_requested' | 'mention' | 'assign' | etc.
      notification_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      -- Classification
      layer INTEGER NOT NULL DEFAULT 4,
      layer_reasons TEXT NOT NULL DEFAULT '[]',
      -- PR-specific
      is_draft INTEGER,
      review_decision TEXT,           -- 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
      additions INTEGER,
      deletions INTEGER,
      -- Sync metadata
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_items_layer_updated
      ON items(layer, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_items_author
      ON items(author_login);
    CREATE INDEX IF NOT EXISTS idx_items_repo
      ON items(repo_owner, repo_name);
    CREATE INDEX IF NOT EXISTS idx_items_updated
      ON items(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_items_notification
      ON items(notification_reason);

    CREATE TABLE IF NOT EXISTS following (
      login TEXT PRIMARY KEY,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS starred_repos (
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (owner, name)
    );

    CREATE TABLE IF NOT EXISTS user_repos (
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      is_owner INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (owner, name)
    );

    CREATE TABLE IF NOT EXISTS repo_collaborators (
      repo_owner TEXT NOT NULL,
      repo_name TEXT NOT NULL,
      login TEXT NOT NULL,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (repo_owner, repo_name, login)
    );

    CREATE TABLE IF NOT EXISTS review_requests (
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      reviewer_login TEXT NOT NULL,
      PRIMARY KEY (item_id, reviewer_login)
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- FTS5 for full-text search
    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      title, repo_full_name, author_login, labels,
      content='items',
      content_rowid='rowid'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, title, repo_full_name, author_login, labels)
      VALUES (NEW.rowid, NEW.title, NEW.repo_owner || '/' || NEW.repo_name, NEW.author_login, NEW.labels);
    END;

    CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, repo_full_name, author_login, labels)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.repo_owner || '/' || OLD.repo_name, OLD.author_login, OLD.labels);
    END;

    CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, repo_full_name, author_login, labels)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.repo_owner || '/' || OLD.repo_name, OLD.author_login, OLD.labels);
      INSERT INTO items_fts(rowid, title, repo_full_name, author_login, labels)
      VALUES (NEW.rowid, NEW.title, NEW.repo_owner || '/' || NEW.repo_name, NEW.author_login, NEW.labels);
    END;
  `);
}
