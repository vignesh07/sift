import type Database from 'better-sqlite3';
import type { Octokit } from '@octokit/rest';
import type { graphql } from '@octokit/graphql';
import { fetchFollowing, fetchStarredRepos, fetchUserRepos, fetchRepoCollaborators } from './social.js';
import { fetchNotifications } from './notifications.js';
import { searchGitHub, buildSearchQueries } from './search.js';
import type { SearchItem } from './search.js';
import { classifyBatch, type ClassificationContext } from '../classify/engine.js';
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
} from '../db/queries.js';
import type { ItemRow } from '../db/queries.js';

type GraphQLFn = ReturnType<typeof graphql.defaults>;

export interface SyncResult {
  itemsSynced: number;
  socialRefreshed: boolean;
  errors: string[];
}

let syncInProgress = false;

export function isSyncInProgress(): boolean {
  return syncInProgress;
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

        // Fetch collaborators for owned repos
        const ownedRepos = repos.filter(r => r.is_owner);
        if (ownedRepos.length > 0) {
          try {
            const collabs = await fetchRepoCollaborators(octokit, ownedRepos);
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
    const searchQueries = buildSearchQueries(username);

    const [notifications, ...searchResults] = await Promise.all([
      fetchNotifications(octokit, lastNotif ?? undefined),
      ...searchQueries.map(q => searchGitHub(gql, q).catch(err => {
        errors.push(`Search failed: ${err}`);
        return [] as SearchItem[];
      })),
    ]);

    // 4. Merge all items by ID, search results take precedence for data quality
    const itemMap = new Map<string, SearchItem & { notification_reason?: string | null }>();

    // Add search results first
    for (const results of searchResults) {
      for (const item of results) {
        itemMap.set(item.id, item);
      }
    }

    // Overlay notification metadata (we can't get full item data from notifications alone,
    // but they tell us the reason)
    for (const n of notifications) {
      // Notifications don't have node IDs directly — we match by repo+number later
      // For now, mark any matching items
      for (const [id, item] of itemMap) {
        if (
          item.repo_owner === n.repository.owner &&
          item.repo_name === n.repository.name &&
          item.title === n.subject.title
        ) {
          itemMap.set(id, { ...item, notification_reason: n.reason });
        }
      }
    }

    // 5. Classify all items
    const items = Array.from(itemMap.values());
    const classifications = classifyBatch(items, ctx);

    // 6. Convert to DB rows and upsert
    const rows: Omit<ItemRow, 'synced_at'>[] = items.map(item => {
      const cls = classifications.get(item.id) ?? { layer: 4, reasons: ['unclassified'] };
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
        notification_reason: (item as any).notification_reason ?? null,
        notification_id: null,
        is_read: 0,
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

    // 8. Update sync state
    setSyncState(db, 'last_notification_sync', new Date().toISOString());
    setSyncState(db, 'last_sync', new Date().toISOString());

    return { itemsSynced: rows.length, socialRefreshed, errors };
  } finally {
    syncInProgress = false;
  }
}

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
    ownedRepos: new Set(repos.filter(r => r.is_owner).map(r => `${r.owner}/${r.name}`)),
    ownedRepoCollaborators: new Set(collabs.map(c => c.login)),
  };
}
