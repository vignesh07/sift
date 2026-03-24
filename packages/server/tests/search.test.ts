import { describe, expect, it } from 'vitest';
import { buildSearchQueries } from '../src/github/search.js';

describe('buildSearchQueries', () => {
  it('includes starred-repo and maintainer-repo searches', () => {
    const queries = buildSearchQueries('me', {
      starredRepos: ['org/a', 'org/b'],
      maintainerRepos: ['mine/x'],
    });

    expect(queries).toContain('is:open repo:org/a repo:org/b sort:updated-desc');
    expect(queries).toContain('is:open repo:mine/x sort:updated-desc');
  });

  it('does not add followed-author queries', () => {
    const queries = buildSearchQueries('me', { maintainerRepos: ['mine/x'] });

    expect(queries.filter((query) => query.includes('author:'))).toEqual([
      'is:open is:pr author:me sort:updated-desc',
    ]);
  });
});
