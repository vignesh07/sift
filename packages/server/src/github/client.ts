import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';

const REQUIRED_SCOPES = ['notifications', 'read:user', 'repo'];

export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export function createGraphQL(token: string) {
  return graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

function parseScopes(header: string | undefined): string[] {
  if (!header) {
    return [];
  }

  return header
    .split(',')
    .map(scope => scope.trim())
    .filter(Boolean);
}

export async function validateToken(token: string): Promise<{
  valid: boolean;
  login?: string;
  scopes: string[];
  missingScopes: string[];
  scopesVerified: boolean;
}> {
  try {
    const octokit = createOctokit(token);
    const { data, headers } = await octokit.users.getAuthenticated();
    const scopes = parseScopes(headers['x-oauth-scopes']);
    const scopesVerified = headers['x-oauth-scopes'] !== undefined;
    const missingScopes = scopesVerified
      ? REQUIRED_SCOPES.filter(scope => !scopes.includes(scope))
      : [];

    return {
      valid: true,
      login: data.login,
      scopes,
      missingScopes,
      scopesVerified,
    };
  } catch {
    return {
      valid: false,
      scopes: [],
      missingScopes: REQUIRED_SCOPES,
      scopesVerified: false,
    };
  }
}
