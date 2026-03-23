import type { Octokit } from '@octokit/rest';

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
  const params: Record<string, unknown> = {
    all: false,
    per_page: 50,
  };
  if (since) {
    params.since = since;
  }

  try {
    const { data } = await octokit.activity.listNotificationsForAuthenticatedUser(params as any);

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
