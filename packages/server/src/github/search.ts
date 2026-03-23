import type { graphql } from '@octokit/graphql';
import { SEARCH_QUERY } from './queries.js';

type GraphQLFn = ReturnType<typeof graphql.defaults>;

export interface SearchItem {
  id: string;
  type: 'pr' | 'issue';
  state: 'open' | 'closed' | 'merged';
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
  labels: string[];
  is_draft: boolean | null;
  review_decision: string | null;
  additions: number | null;
  deletions: number | null;
  requested_reviewers: string[];
}

function normalizeState(typename: string, state: string): 'open' | 'closed' | 'merged' {
  if (typename === 'PullRequest' && state === 'MERGED') return 'merged';
  if (state === 'CLOSED') return 'closed';
  return 'open';
}

function parseSearchNode(node: any): SearchItem | null {
  if (!node || !node.__typename) return null;

  const isPR = node.__typename === 'PullRequest';

  return {
    id: node.id,
    type: isPR ? 'pr' : 'issue',
    state: normalizeState(node.__typename, node.state),
    title: node.title,
    url: node.url,
    number: node.number,
    repo_owner: node.repository.owner.login,
    repo_name: node.repository.name,
    author_login: node.author?.login ?? 'ghost',
    author_avatar: node.author?.avatarUrl ?? null,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
    comment_count: node.comments?.totalCount ?? 0,
    reaction_count: node.reactions?.totalCount ?? 0,
    participant_count: node.participants?.totalCount ?? 0,
    labels: (node.labels?.nodes ?? []).map((l: any) => l.name),
    is_draft: isPR ? node.isDraft : null,
    review_decision: isPR ? node.reviewDecision : null,
    additions: isPR ? node.additions : null,
    deletions: isPR ? node.deletions : null,
    requested_reviewers: isPR
      ? (node.reviewRequests?.nodes ?? [])
          .map((r: any) => r.requestedReviewer?.login ?? r.requestedReviewer?.name)
          .filter(Boolean)
      : [],
  };
}

export async function searchGitHub(gql: GraphQLFn, query: string): Promise<SearchItem[]> {
  const items: SearchItem[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const data: any = await gql(SEARCH_QUERY, { searchQuery: query, cursor });
    const { nodes, pageInfo } = data.search;

    for (const node of nodes) {
      const item = parseSearchNode(node);
      if (item) items.push(item);
    }

    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    pages++;
  } while (cursor && pages < 3); // Cap at 150 items per query

  return items;
}

export function buildSearchQueries(username: string): string[] {
  return [
    // PRs where I'm requested for review
    `is:open is:pr review-requested:${username} sort:updated-desc`,
    // Issues mentioning me
    `is:open mentions:${username} sort:updated-desc`,
    // PRs I authored that are open
    `is:open is:pr author:${username} sort:updated-desc`,
    // Recent activity in issues/PRs I'm involved in
    `is:open involves:${username} sort:updated-desc`,
  ];
}
