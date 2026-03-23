import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';

export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export function createGraphQL(token: string) {
  return graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

export async function validateToken(token: string): Promise<{ valid: boolean; login?: string }> {
  try {
    const octokit = createOctokit(token);
    const { data } = await octokit.users.getAuthenticated();
    return { valid: true, login: data.login };
  } catch {
    return { valid: false };
  }
}
