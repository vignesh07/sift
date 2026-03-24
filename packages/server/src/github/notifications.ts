import type { Octokit } from '@octokit/rest';
import type { SearchItem } from './search.js';

export interface NotificationItem {
  id: string;
  reason: string;
  subject: {
    type: string;
    title: string;
    url: string | null;
  };
  repository: {
    owner: string;
    name: string;
  };
  updated_at: string;
  unread: boolean;
}

export async function fetchNotifications(
  octokit: Octokit,
  since?: string,
): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];
  const baseParams: Record<string, unknown> = {
    all: false,
    per_page: 100,
  };
  if (since) {
    baseParams.since = since;
  }

  try {
    for (let page = 1; page <= 10; page++) {
      const { data } = await octokit.activity.listNotificationsForAuthenticatedUser({
        ...(baseParams as any),
        page,
      });

      for (const n of data) {
        if (n.subject.type !== 'PullRequest' && n.subject.type !== 'Issue') continue;

        items.push({
          id: n.id,
          reason: n.reason,
          subject: {
            type: n.subject.type,
            title: n.subject.title,
            url: n.subject.url ?? null,
          },
          repository: {
            owner: n.repository.owner.login,
            name: n.repository.name,
          },
          updated_at: n.updated_at,
          unread: n.unread,
        });
      }

      if (data.length < 100) {
        break;
      }
    }
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
  }

  return items;
}

/** Extract the issue/PR number from a GitHub API URL like /repos/owner/name/pulls/123 */
export function extractNumberFromUrl(url: string): number | null {
  const match = url.match(/\/(pulls|issues)\/(\d+)$/);
  return match ? parseInt(match[2], 10) : null;
}

function normalizeState(type: 'Issue' | 'PullRequest', state: string, mergedAt?: string | null): 'open' | 'closed' | 'merged' {
  if (type === 'PullRequest' && mergedAt) {
    return 'merged';
  }
  if (state.toLowerCase() === 'closed') {
    return 'closed';
  }
  return 'open';
}

function toIssueSearchItem(repoOwner: string, repoName: string, data: any): SearchItem {
  return {
    id: data.node_id,
    type: 'issue',
    state: normalizeState('Issue', data.state),
    title: data.title,
    url: data.html_url,
    number: data.number,
    repo_owner: repoOwner,
    repo_name: repoName,
    author_login: data.user?.login ?? 'ghost',
    author_avatar: data.user?.avatar_url ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    comment_count: data.comments ?? 0,
    reaction_count: data.reactions?.total_count ?? 0,
    participant_count: data.assignees?.length ?? 0,
    labels: (data.labels ?? []).map((label: any) => typeof label === 'string' ? label : label.name).filter(Boolean),
    is_draft: null,
    review_decision: null,
    additions: null,
    deletions: null,
    requested_reviewers: [],
  };
}

function toPullRequestSearchItem(repoOwner: string, repoName: string, data: any): SearchItem {
  return {
    id: data.node_id,
    type: 'pr',
    state: normalizeState('PullRequest', data.state, data.merged_at),
    title: data.title,
    url: data.html_url,
    number: data.number,
    repo_owner: repoOwner,
    repo_name: repoName,
    author_login: data.user?.login ?? 'ghost',
    author_avatar: data.user?.avatar_url ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    comment_count: (data.comments ?? 0) + (data.review_comments ?? 0),
    reaction_count: data.reactions?.total_count ?? 0,
    participant_count: (data.requested_reviewers ?? []).length,
    labels: (data.labels ?? []).map((label: any) => typeof label === 'string' ? label : label.name).filter(Boolean),
    is_draft: data.draft ?? false,
    review_decision: null,
    additions: data.additions ?? null,
    deletions: data.deletions ?? null,
    requested_reviewers: (data.requested_reviewers ?? []).map((reviewer: any) => reviewer.login).filter(Boolean),
  };
}

async function fetchNotificationSubjectItem(
  octokit: Octokit,
  notification: NotificationItem,
): Promise<SearchItem | null> {
  const number = notification.subject.url
    ? extractNumberFromUrl(notification.subject.url)
    : null;

  if (number === null) {
    return null;
  }

  if (notification.subject.type === 'PullRequest') {
    const { data } = await octokit.pulls.get({
      owner: notification.repository.owner,
      repo: notification.repository.name,
      pull_number: number,
    });

    return toPullRequestSearchItem(notification.repository.owner, notification.repository.name, data);
  }

  const { data } = await octokit.issues.get({
    owner: notification.repository.owner,
    repo: notification.repository.name,
    issue_number: number,
  });

  if ('pull_request' in data) {
    return null;
  }

  return toIssueSearchItem(notification.repository.owner, notification.repository.name, data);
}

export async function fetchNotificationSubjectItems(
  octokit: Octokit,
  notifications: NotificationItem[],
  limit = 100,
): Promise<SearchItem[]> {
  const items: SearchItem[] = [];
  const capped = notifications.slice(0, limit);

  for (let index = 0; index < capped.length; index += 10) {
    const batch = capped.slice(index, index + 10);
    const results = await Promise.all(
      batch.map(async (notification) => {
        try {
          return await fetchNotificationSubjectItem(octokit, notification);
        } catch {
          return null;
        }
      }),
    );

    for (const item of results) {
      if (item) {
        items.push(item);
      }
    }
  }

  return items;
}
