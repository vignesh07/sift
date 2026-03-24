import { describe, expect, it } from 'vitest';
import { buildSearchQueries } from '../src/github/search.js';

describe('buildSearchQueries', () => {
  it('includes batched followed-author-on-user-repo, starred-repo, and maintainer-repo searches', () => {
    const queries = buildSearchQueries('me', {
      followedLogins: ['alice', 'bob', 'carol', 'dave', 'erin', 'frank'],
      userRepos: ['my/repo-a', 'my/repo-b'],
      starredRepos: ['org/a', 'org/b'],
      maintainerRepos: ['mine/x'],
    });

    expect(queries).toContain('is:open author:alice author:bob author:carol author:dave author:erin repo:my/repo-a repo:my/repo-b sort:updated-desc');
    expect(queries).toContain('is:open author:frank repo:my/repo-a repo:my/repo-b sort:updated-desc');
    expect(queries).toContain('is:open repo:org/a repo:org/b sort:updated-desc');
    expect(queries).toContain('is:open repo:mine/x sort:updated-desc');
  });

  it('does not add Layer 2 queries without a repo intersection', () => {
    const queries = buildSearchQueries('me', {
      followedLogins: ['alice'],
    });

    expect(queries.some((query) => query.includes('author:alice'))).toBe(false);
  });
});
