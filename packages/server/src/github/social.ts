import type { graphql } from '@octokit/graphql';
import { FOLLOWING_QUERY, STARRED_REPOS_QUERY, USER_REPOS_QUERY } from './queries.js';

type GraphQLFn = ReturnType<typeof graphql.defaults>;

export async function fetchFollowing(gql: GraphQLFn): Promise<string[]> {
  const logins: string[] = [];
  let cursor: string | null = null;

  do {
    const data: any = await gql(FOLLOWING_QUERY, { cursor });
    const { nodes, pageInfo } = data.viewer.following;
    for (const node of nodes) {
      logins.push(node.login);
    }
    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  return logins;
}

export async function fetchStarredRepos(gql: GraphQLFn): Promise<{ owner: string; name: string }[]> {
  const repos: { owner: string; name: string }[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const data: any = await gql(STARRED_REPOS_QUERY, { cursor });
    const { nodes, pageInfo } = data.viewer.starredRepositories;
    for (const node of nodes) {
      repos.push({ owner: node.owner.login, name: node.name });
    }
    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    pages++;
  } while (cursor && pages < 5); // Cap at 500 starred repos

  return repos;
}

export async function fetchUserRepos(gql: GraphQLFn): Promise<{ owner: string; name: string; is_owner: boolean }[]> {
  const repos: { owner: string; name: string; is_owner: boolean }[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const data: any = await gql(USER_REPOS_QUERY, { cursor });
    const { nodes, pageInfo } = data.viewer.repositories;
    for (const node of nodes) {
      repos.push({
        owner: node.owner.login,
        name: node.name,
        is_owner: node.viewerPermission === 'ADMIN',
      });
    }
    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    pages++;
  } while (cursor && pages < 5);

  return repos;
}
