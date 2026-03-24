import type Database from 'better-sqlite3';
import type { Octokit } from '@octokit/rest';
import type { graphql } from '@octokit/graphql';
import { fetchFollowing, fetchStarredRepos, fetchUserRepos, fetchRepoCollaborators } from './social.js';
import {
  extractNumberFromUrl,
  fetchItemByRepoNumber,
  fetchNotifications,
  fetchNotificationSubjectItems,
  type NotificationItem,
} from './notifications.js';
import { searchGitHub, buildSearchQueries } from './search.js';
import type { SearchItem } from './search.js';
import { classify, classifyBatch, type ClassificationContext } from '../classify/engine.js';
import {
  upsertItems,
  upsertFollowing,
  upsertStarredRepos,
  upsertUserRepos,
  upsertReviewRequests,
  upsertRepoCollaborators,
  getSyncState,
  setSyncState,
  getFollowing,
  getStarredRepos,
  getUserRepos,
  getRepoCollaborators,
  queryItems,
} from '../db/queries.js';
import type { ItemRow } from '../db/queries.js';

type GraphQLFn = ReturnType<typeof graphql.defaults>;

export interface SyncResult {
  itemsSynced: number;
  socialRefreshed: boolean;
  errors: string[];
}

type SyncedItem = SearchItem & {
  notification_reason?: string | null;
  notification_id?: string | null;
  is_read?: number;
};

let syncInProgress = false;

export function isSyncInProgress(): boolean {
  return syncInProgress;
}

function getRepoNumberKey(repoOwner: string, repoName: string, number: number): string {
  return `${repoOwner}/${repoName}#${number}`;
}

function addItem(
  itemMap: Map<string, SyncedItem>,
  itemIndex: Map<string, string>,
  item: SyncedItem,
): void {
  const existing = itemMap.get(item.id);
  const merged: SyncedItem = {
    ...existing,
    ...item,
    notification_reason: item.notification_reason ?? existing?.notification_reason ?? null,
    notification_id: item.notification_id ?? existing?.notification_id ?? null,
    is_read: item.is_read ?? existing?.is_read ?? 1,
  };

  itemMap.set(item.id, merged);
  itemIndex.set(getRepoNumberKey(merged.repo_owner, merged.repo_name, merged.number), merged.id);
}

function attachNotification(
  itemMap: Map<string, SyncedItem>,
  itemIndex: Map<string, string>,
  notification: NotificationItem,
): boolean {
  const number = notification.subject.url
    ? extractNumberFromUrl(notification.subject.url)
    : null;

  if (number === null) {
    return false;
  }

  const key = getRepoNumberKey(notification.repository.owner, notification.repository.name, number);
  const itemId = itemIndex.get(key);

  if (!itemId) {
    return false;
  }

  const existing = itemMap.get(itemId);
  if (!existing) {
    return false;
  }

  itemMap.set(itemId, {
    ...existing,
    notification_reason: notification.reason,
    notification_id: notification.id,
    is_read: notification.unread ? 0 : 1,
  });

  return true;
}

async function refreshStaleOpenItems(
  octokit: Octokit,
  rows: ItemRow[],
  limit = 100,
): Promise<SearchItem[]> {
  const refreshed: SearchItem[] = [];
  const candidates = rows.slice(0, limit);

  for (let index = 0; index < candidates.length; index += 10) {
    const batch = candidates.slice(index, index + 10);
    const results = await Promise.all(
      batch.map(async (row) => {
        try {
          return await fetchItemByRepoNumber(
            octokit,
            row.type as 'pr' | 'issue',
            row.repo_owner,
            row.repo_name,
            row.number,
          );
        } catch {
          return null;
        }
      }),
    );

    for (const item of results) {
      if (item && item.state !== 'open') {
        refreshed.push(item);
      }
    }
  }

  return refreshed;
}

async function refreshRecentOpenPullRequests(
  octokit: Octokit,
  items: SyncedItem[],
  limit = 50,
): Promise<SearchItem[]> {
  const refreshed: SearchItem[] = [];
  const candidates = items
    .filter((item) => item.type === 'pr' && item.state === 'open')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);

  for (let index = 0; index < candidates.length; index += 10) {
    const batch = candidates.slice(index, index + 10);
    const results = await Promise.all(
      batch.map(async (item) => {
        try {
          return await fetchItemByRepoNumber(
            octokit,
            'pr',
            item.repo_owner,
            item.repo_name,
            item.number,
          );
        } catch {
          return null;
        }
      }),
    );

    for (let i = 0; i < results.length; i += 1) {
      const item = results[i];
      if (item && item.state !== batch[i].state) {
        refreshed.push(item);
      }
    }
  }

  return refreshed;
}

export async function runSync(
  db: Database.Database,
  octokit: Octokit,
  gql: GraphQLFn,
  username: string,
): Promise<SyncResult> {
  if (syncInProgress) {
    return { itemsSynced: 0, socialRefreshed: false, errors: ['Sync already in progress'] };
  }

  syncInProgress = true;
  const errors: string[] = [];
  let socialRefreshed = false;
  const syncStartedAt = new Date().toISOString();

  try {
    // 1. Refresh social graph if stale (> 1 hour)
    const lastSocial = getSyncState(db, 'last_social_sync');
    const socialStale = !lastSocial || Date.now() - new Date(lastSocial).getTime() > 3600_000;

    if (socialStale) {
      try {
        const [following, starred, repos] = await Promise.all([
          fetchFollowing(gql),
          fetchStarredRepos(gql),
          fetchUserRepos(gql),
        ]);

        upsertFollowing(db, following);
        upsertStarredRepos(db, starred);
        upsertUserRepos(db, repos);

        // Fetch collaborators for repos you maintain (ADMIN/MAINTAIN/WRITE)
        const MAINTAINER_PERMS = new Set(['ADMIN', 'MAINTAIN', 'WRITE']);
        const maintainerRepos = repos.filter(r => MAINTAINER_PERMS.has(r.permission));
        if (maintainerRepos.length > 0) {
          try {
            const collabs = await fetchRepoCollaborators(octokit, maintainerRepos);
            for (const c of collabs) {
              upsertRepoCollaborators(db, c.owner, c.name, c.logins);
            }
          } catch (err) {
            errors.push(`Collaborator sync failed: ${err}`);
          }
        }

        setSyncState(db, 'last_social_sync', new Date().toISOString());
        socialRefreshed = true;
      } catch (err) {
        errors.push(`Social sync failed: ${err}`);
      }
    }

    // 2. Build classification context from DB
    const ctx = buildContext(db, username);

    // 3. Fetch notifications and search results in parallel
    const lastNotif = getSyncState(db, 'last_notification_sync');
    const maintainerRepoKeys = Array.from(ctx.maintainerRepos);
    const searchQueries = buildSearchQueries(username, {
      maintainerRepos: maintainerRepoKeys,
      followedLogins: Array.from(ctx.following),
      userRepos: Array.from(ctx.userRepos),
      starredRepos: Array.from(ctx.starredRepos),
    });

    const [notifications, ...searchResults] = await Promise.all([
      fetchNotifications(octokit, lastNotif ?? undefined),
      ...searchQueries.map(q => searchGitHub(gql, q).catch(err => {
        errors.push(`Search failed: ${err}`);
        return [] as SearchItem[];
      })),
    ]);

    // 4. Merge all items by ID, search results take precedence for data quality
    const itemMap = new Map<string, SyncedItem>();
    const itemIndex = new Map<string, string>();

    // Add search results first
    for (const results of searchResults) {
      for (const item of results) {
        addItem(itemMap, itemIndex, item);
      }
    }

    // Overlay notification metadata by repo/number. Any notifications not already
    // represented by search are fetched directly so inbox items do not disappear.
    const missingNotifications: NotificationItem[] = [];
    for (const n of notifications) {
      if (!attachNotification(itemMap, itemIndex, n)) {
        missingNotifications.push(n);
      }
    }

    if (missingNotifications.length > 0) {
      const notificationItems = await fetchNotificationSubjectItems(octokit, missingNotifications);
      for (const item of notificationItems) {
        addItem(itemMap, itemIndex, item);
      }
      for (const notification of missingNotifications) {
        attachNotification(itemMap, itemIndex, notification);
      }
    }

    // GitHub search can briefly lag after a PR closes or merges. Revalidate a
    // recent slice of open PRs directly so the inbox does not keep stale opens.
    const recentlyUpdatedPullRequests = await refreshRecentOpenPullRequests(
      octokit,
      Array.from(itemMap.values()),
    );
    for (const item of recentlyUpdatedPullRequests) {
      addItem(itemMap, itemIndex, item);
    }

    // Open items that disappeared from the current sync corpus may have been
    // closed or merged. Refresh a recent slice so stale "open" rows drop out.
    const staleOpenCandidates = queryItems(db, { state: 'open', limit: 500 }).items.filter(
      (row) => !itemMap.has(row.id),
    );
    if (staleOpenCandidates.length > 0) {
      const refreshedClosedItems = await refreshStaleOpenItems(octokit, staleOpenCandidates);
      for (const item of refreshedClosedItems) {
        addItem(itemMap, itemIndex, item);
      }
    }

    // 5. Classify all items
    const items = Array.from(itemMap.values());
    const classifications = classifyBatch(items, ctx);

    // 6. Convert to DB rows and upsert
    const rows: Omit<ItemRow, 'synced_at'>[] = items.map(item => {
      const cls = classifications.get(item.id) ?? { layer: 5, reasons: ['unclassified'] };
      return {
        id: item.id,
        type: item.type,
        state: item.state,
        title: item.title,
        url: item.url,
        number: item.number,
        repo_owner: item.repo_owner,
        repo_name: item.repo_name,
        author_login: item.author_login,
        author_avatar: item.author_avatar,
        created_at: item.created_at,
        updated_at: item.updated_at,
        comment_count: item.comment_count,
        reaction_count: item.reaction_count,
        participant_count: item.participant_count,
        labels: JSON.stringify(item.labels),
        notification_reason: item.notification_reason ?? null,
        notification_id: item.notification_id ?? null,
        is_read: item.is_read ?? 1,
        layer: cls.layer,
        layer_reasons: JSON.stringify(cls.reasons),
        is_draft: item.is_draft === null ? null : item.is_draft ? 1 : 0,
        review_decision: item.review_decision,
        additions: item.additions,
        deletions: item.deletions,
      };
    });

    upsertItems(db, rows);

    // 7. Store review requests
    for (const item of items) {
      if (item.requested_reviewers.length > 0) {
        upsertReviewRequests(db, item.id, item.requested_reviewers);
      }
    }

    // 8. Reclassify all existing items (handles rule changes)
    reclassifyAll(db, ctx);

    // 9. Update sync state
    setSyncState(db, 'last_sync_started', syncStartedAt);
    setSyncState(db, 'last_notification_sync', new Date().toISOString());
    setSyncState(db, 'last_sync', new Date().toISOString());

    return { itemsSynced: rows.length, socialRefreshed, errors };
  } finally {
    syncInProgress = false;
  }
}

function reclassifyAll(db: Database.Database, ctx: ClassificationContext): void {
  const { items } = queryItems(db, { limit: 10000 });
  if (items.length === 0) return;

  // Load review requests so Layer 1 review_requested works
  const reviewRows = db.prepare('SELECT item_id, reviewer_login FROM review_requests').all() as { item_id: string; reviewer_login: string }[];
  const reviewMap = new Map<string, string[]>();
  for (const r of reviewRows) {
    const arr = reviewMap.get(r.item_id) ?? [];
    arr.push(r.reviewer_login);
    reviewMap.set(r.item_id, arr);
  }

  const updateStmt = db.prepare(
    'UPDATE items SET layer = @layer, layer_reasons = @layer_reasons WHERE id = @id'
  );

  const tx = db.transaction(() => {
    for (const row of items) {
      const result = classify(
        {
          id: row.id,
          type: row.type as 'pr' | 'issue',
          state: row.state as 'open' | 'closed' | 'merged',
          title: row.title,
          url: row.url,
          number: row.number,
          repo_owner: row.repo_owner,
          repo_name: row.repo_name,
          author_login: row.author_login,
          author_avatar: row.author_avatar,
          created_at: row.created_at,
          updated_at: row.updated_at,
          comment_count: row.comment_count,
          reaction_count: row.reaction_count,
          participant_count: row.participant_count,
          labels: JSON.parse(row.labels || '[]'),
          is_draft: row.is_draft === null ? null : row.is_draft === 1,
          review_decision: row.review_decision,
          additions: row.additions,
          deletions: row.deletions,
          requested_reviewers: reviewMap.get(row.id) ?? [],
          notification_reason: row.notification_reason,
        },
        ctx,
      );
      updateStmt.run({
        id: row.id,
        layer: result.layer,
        layer_reasons: JSON.stringify(result.reasons),
      });
    }
  });
  tx();
}

const MAINTAINER_PERMISSIONS = new Set(['ADMIN', 'MAINTAIN', 'WRITE']);

function buildContext(db: Database.Database, username: string): ClassificationContext {
  const following = new Set(getFollowing(db));
  const starred = getStarredRepos(db);
  const repos = getUserRepos(db);
  const collabs = getRepoCollaborators(db);

  return {
    username,
    following,
    starredRepos: new Set(starred.map(r => `${r.owner}/${r.name}`)),
    userRepos: new Set(repos.map(r => `${r.owner}/${r.name}`)),
    ownedRepos: new Set(repos.filter(r => r.permission === 'ADMIN').map(r => `${r.owner}/${r.name}`)),
    maintainerRepos: new Set(repos.filter(r => MAINTAINER_PERMISSIONS.has(r.permission)).map(r => `${r.owner}/${r.name}`)),
    maintainerRepoCollaborators: new Set(collabs.map(c => c.login)),
  };
}
