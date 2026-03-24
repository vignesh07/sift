import { describe, it, expect } from 'vitest';
import { classify, classifyBatch, type ClassificationContext } from '../src/classify/engine.js';
import type { SearchItem } from '../src/github/search.js';

function makeItem(overrides: Partial<SearchItem & { notification_reason?: string }> = {}): SearchItem & { notification_reason?: string | null } {
  return {
    id: 'node-1',
    type: 'pr',
    state: 'open',
    title: 'Fix bug',
    url: 'https://github.com/org/repo/pull/1',
    number: 1,
    repo_owner: 'org',
    repo_name: 'repo',
    author_login: 'alice',
    author_avatar: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    comment_count: 0,
    reaction_count: 0,
    participant_count: 1,
    labels: [],
    is_draft: false,
    review_decision: null,
    additions: 10,
    deletions: 5,
    requested_reviewers: [],
    notification_reason: null,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<ClassificationContext> = {}): ClassificationContext {
  return {
    username: 'me',
    starredRepos: new Set<string>(),
    ownedRepos: new Set<string>(),
    maintainerRepos: new Set<string>(),
    maintainerRepoCollaborators: new Map<string, Set<string>>(),
    ...overrides,
  };
}

describe('classify', () => {
  describe('Layer 1 — Needs You', () => {
    it('classifies review requested (from PR data)', () => {
      const item = makeItem({ requested_reviewers: ['me'] });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(1);
      expect(result.reasons).toContain('review_requested');
    });

    it('classifies review requested (from notification)', () => {
      const item = makeItem({ notification_reason: 'review_requested' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(1);
      expect(result.reasons).toContain('notification_review_requested');
    });

    it('classifies assigned', () => {
      const item = makeItem({ notification_reason: 'assign' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(1);
      expect(result.reasons).toContain('assigned');
    });

    it('does NOT classify PR on owned repo as Layer 1', () => {
      const item = makeItem({ type: 'pr', repo_owner: 'me', repo_name: 'my-lib', author_login: 'alice' });
      const ctx = makeCtx({ ownedRepos: new Set(['me/my-lib']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(3);
      expect(result.reasons).toContain('pr_on_owned_repo');
    });

    it('does NOT classify your own PR on your repo as pr_on_owned_repo', () => {
      const item = makeItem({ type: 'pr', repo_owner: 'me', repo_name: 'my-lib', author_login: 'me' });
      const ctx = makeCtx({ ownedRepos: new Set(['me/my-lib']) });
      const result = classify(item, ctx);
      expect(result.reasons).not.toContain('pr_on_owned_repo');
    });

    it('classifies your PR with changes requested', () => {
      const item = makeItem({ author_login: 'me', review_decision: 'CHANGES_REQUESTED' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(1);
      expect(result.reasons).toContain('your_pr_changes_requested');
    });

    it('classifies your open PR', () => {
      const item = makeItem({ author_login: 'me', state: 'open' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(1);
      expect(result.reasons).toContain('your_open_pr');
    });

    it('classifies your open issue', () => {
      const item = makeItem({ type: 'issue', author_login: 'me', state: 'open' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(1);
      expect(result.reasons).toContain('your_open_issue');
    });

    it('does NOT classify someone else opening an issue on your repo as Layer 1', () => {
      const item = makeItem({ type: 'issue', repo_owner: 'me', repo_name: 'my-lib', author_login: 'alice' });
      const ctx = makeCtx({ ownedRepos: new Set(['me/my-lib']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(3);
      expect(result.reasons).toContain('issue_on_owned_repo');
    });

    it('collects multiple Layer 1 reasons', () => {
      const item = makeItem({
        author_login: 'me',
        state: 'open',
        review_decision: 'CHANGES_REQUESTED',
      });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(1);
      expect(result.reasons).toContain('your_pr_changes_requested');
      expect(result.reasons).toContain('your_open_pr');
    });

    it('does NOT classify mentions as Layer 1', () => {
      const item = makeItem({ notification_reason: 'mention' });
      const result = classify(item, makeCtx());
      expect(result.layer).not.toBe(1);
    });
  });

  describe('Layer 2 — Your Circle', () => {
    it('classifies maintainer activity on an owned repo', () => {
      const item = makeItem({ author_login: 'alice', repo_owner: 'me', repo_name: 'repo' });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/repo']),
        maintainerRepos: new Set(['me/repo']),
        maintainerRepoCollaborators: new Map([
          ['me/repo', new Set(['alice'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).toBe(2);
      expect(result.reasons).toContain('maintainer_on_owned_repo');
    });

    it('classifies maintainers on contributing repos as Layer 2', () => {
      const item = makeItem({ author_login: 'alice', repo_owner: 'org', repo_name: 'repo' });
      const ctx = makeCtx({
        maintainerRepos: new Set(['org/repo']),
        maintainerRepoCollaborators: new Map([
          ['org/repo', new Set(['alice'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).toBe(2);
      expect(result.reasons).toContain('maintainer_on_contributing_repo');
    });

    it('does NOT classify a maintainer on an owned repo if they are only a maintainer elsewhere', () => {
      const item = makeItem({ author_login: 'alice', repo_owner: 'me', repo_name: 'repo' });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/repo']),
        maintainerRepos: new Set(['me/repo', 'elsewhere/repo']),
        maintainerRepoCollaborators: new Map([
          ['elsewhere/repo', new Set(['alice'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).not.toBe(2);
    });

    it('does NOT classify your own activity as Layer 2', () => {
      const item = makeItem({ author_login: 'me', repo_owner: 'me', repo_name: 'repo' });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/repo']),
        maintainerRepos: new Set(['me/repo']),
        maintainerRepoCollaborators: new Map([
          ['me/repo', new Set(['me'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).not.toBe(2);
    });

    it('does NOT classify owned repo activity without maintainer access as Layer 2', () => {
      const item = makeItem({ author_login: 'alice', repo_owner: 'me', repo_name: 'repo' });
      const ctx = makeCtx({ ownedRepos: new Set(['me/repo']) });
      const result = classify(item, ctx);
      expect(result.layer).not.toBe(2);
    });

    it('Layer 1 trumps Layer 2', () => {
      const item = makeItem({
        author_login: 'alice',
        notification_reason: 'assign',
      });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/repo']),
        maintainerRepos: new Set(['me/repo']),
        maintainerRepoCollaborators: new Map([
          ['me/repo', new Set(['alice'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).toBe(1);
    });
  });

  describe('Layer 3 — Your Repos', () => {
    it('classifies non-maintainer issue activity on owned repo', () => {
      const item = makeItem({ type: 'issue', repo_owner: 'me', repo_name: 'project', author_login: 'bob' });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/project']),
      });
      const result = classify(item, ctx);
      expect(result.layer).toBe(3);
      expect(result.reasons).toContain('issue_on_owned_repo');
    });

    it('classifies non-maintainer PR activity on owned repo', () => {
      const item = makeItem({ type: 'pr', repo_owner: 'me', repo_name: 'project', author_login: 'bob' });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/project']),
      });
      const result = classify(item, ctx);
      expect(result.layer).toBe(3);
      expect(result.reasons).toContain('pr_on_owned_repo');
    });

    it('does NOT classify maintainer activity on contributing repo as Layer 3', () => {
      const item = makeItem({ type: 'issue', repo_owner: 'org', repo_name: 'project', author_login: 'bob' });
      const ctx = makeCtx({
        maintainerRepos: new Set(['org/project']),
        maintainerRepoCollaborators: new Map([
          ['org/project', new Set(['bob'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).not.toBe(3);
    });

    it('does NOT classify maintainer PR on contributing repo as Layer 3', () => {
      const item = makeItem({ type: 'pr', repo_owner: 'org', repo_name: 'project', author_login: 'bob' });
      const ctx = makeCtx({
        maintainerRepos: new Set(['org/project']),
        maintainerRepoCollaborators: new Map([
          ['org/project', new Set(['bob'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).not.toBe(3);
    });

    it('maintainer PRs on owned repos stay in Layer 2', () => {
      const item = makeItem({ type: 'pr', repo_owner: 'me', repo_name: 'my-lib', author_login: 'bob' });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/my-lib']),
        maintainerRepos: new Set(['me/my-lib']),
        maintainerRepoCollaborators: new Map([
          ['me/my-lib', new Set(['bob'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).toBe(2);
      expect(result.reasons).toContain('maintainer_on_owned_repo');
    });

    it('non-maintainer PRs on owned repos move to Layer 3', () => {
      const item = makeItem({ type: 'pr', repo_owner: 'me', repo_name: 'my-lib', author_login: 'bob' });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/my-lib']),
        maintainerRepos: new Set(['me/my-lib']),
        maintainerRepoCollaborators: new Map([
          ['me/my-lib', new Set(['carol'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).toBe(3);
      expect(result.reasons).toContain('pr_on_owned_repo');
    });

    it('does NOT classify yourself as maintainer', () => {
      const item = makeItem({ type: 'issue', repo_owner: 'org', repo_name: 'project', author_login: 'me' });
      const ctx = makeCtx({
        maintainerRepos: new Set(['org/project']),
        maintainerRepoCollaborators: new Map([
          ['org/project', new Set(['me'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.reasons).not.toContain('maintainer_on_contributing_repo');
    });

    it('does NOT classify activity on non-maintainer repo', () => {
      const item = makeItem({ type: 'issue', repo_owner: 'org', repo_name: 'other', author_login: 'bob' });
      const ctx = makeCtx({
        maintainerRepos: new Set(['org/project']),
        maintainerRepoCollaborators: new Map([
          ['org/project', new Set(['bob'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).not.toBe(3);
    });

    it('maintainer activity hits Layer 2 before Layer 3', () => {
      const item = makeItem({ type: 'issue', repo_owner: 'me', repo_name: 'project', author_login: 'bob' });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/project']),
        maintainerRepos: new Set(['me/project']),
        maintainerRepoCollaborators: new Map([
          ['me/project', new Set(['bob'])],
        ]),
      });
      const result = classify(item, ctx);
      expect(result.layer).toBe(2);
    });
  });

  describe('Layer 4 — Interesting', () => {
    it('classifies mentions as Layer 4', () => {
      const item = makeItem({ notification_reason: 'mention' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(4);
      expect(result.reasons).toContain('mentioned');
    });

    it('does not classify plain starred repos as Layer 4', () => {
      const item = makeItem({ repo_owner: 'org', repo_name: 'repo' });
      const ctx = makeCtx({ starredRepos: new Set(['org/repo']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(5);
      expect(result.reasons).toEqual(['starred_repo']);
    });

    it('classifies high comment count', () => {
      const item = makeItem({ comment_count: 15 });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(4);
      expect(result.reasons).toContain('high_comments');
    });

    it('keeps starred repo items in Layer 4 when they also have engagement', () => {
      const item = makeItem({ repo_owner: 'org', repo_name: 'repo', comment_count: 15 });
      const ctx = makeCtx({ starredRepos: new Set(['org/repo']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(4);
      expect(result.reasons).toContain('starred_repo');
      expect(result.reasons).toContain('high_comments');
    });

    it('classifies high reaction count', () => {
      const item = makeItem({ reaction_count: 10 });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(4);
      expect(result.reasons).toContain('high_reactions');
    });

    it('classifies many participants', () => {
      const item = makeItem({ participant_count: 5 });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(4);
      expect(result.reasons).toContain('many_participants');
    });

    it('does not trigger with borderline counts', () => {
      const item = makeItem({ comment_count: 9, reaction_count: 9, participant_count: 4 });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(5);
    });

    it('Layer 2 trumps Layer 4 (owned-repo maintainer on a starred repo)', () => {
      const item = makeItem({ author_login: 'alice', repo_owner: 'me', repo_name: 'repo' });
      const ctx = makeCtx({
        ownedRepos: new Set(['me/repo']),
        maintainerRepos: new Set(['me/repo']),
        maintainerRepoCollaborators: new Map([
          ['me/repo', new Set(['alice'])],
        ]),
        starredRepos: new Set(['me/repo']),
      });
      const result = classify(item, ctx);
      expect(result.layer).toBe(2);
    });
  });

  describe('Layer 5 — Everything Else', () => {
    it('classifies unmatched items as Layer 5', () => {
      const item = makeItem();
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(5);
      expect(result.reasons).toEqual(['no_special_signals']);
    });

    it('issues with no signals are Layer 5', () => {
      const item = makeItem({ type: 'issue' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(5);
    });

    it('keeps low-signal starred repo activity in Layer 5', () => {
      const item = makeItem({ repo_owner: 'org', repo_name: 'repo' });
      const ctx = makeCtx({ starredRepos: new Set(['org/repo']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(5);
      expect(result.reasons).toEqual(['starred_repo']);
    });
  });
});

describe('classifyBatch', () => {
  it('bumps prolific authors from Layer 5 to Layer 4', () => {
    const items = [
      makeItem({ id: 'n1', author_login: 'prolific' }),
      makeItem({ id: 'n2', author_login: 'prolific' }),
      makeItem({ id: 'n3', author_login: 'prolific' }),
    ];
    const results = classifyBatch(items, makeCtx());

    for (const [, result] of results) {
      expect(result.layer).toBe(4);
      expect(result.reasons).toContain('prolific_author');
    }
  });

  it('does NOT bump prolific authors who already have a better layer', () => {
    const items = [
      makeItem({ id: 'n1', author_login: 'prolific', notification_reason: 'assign' }),
      makeItem({ id: 'n2', author_login: 'prolific' }),
      makeItem({ id: 'n3', author_login: 'prolific' }),
    ];
    const results = classifyBatch(items, makeCtx());

    expect(results.get('n1')!.layer).toBe(1);
    expect(results.get('n2')!.layer).toBe(4);
    expect(results.get('n3')!.layer).toBe(4);
  });

  it('handles mixed authors', () => {
    const items = [
      makeItem({ id: 'n1', author_login: 'alice' }),
      makeItem({ id: 'n2', author_login: 'bob' }),
      makeItem({ id: 'n3', author_login: 'alice' }),
    ];
    const results = classifyBatch(items, makeCtx());

    expect(results.get('n1')!.layer).toBe(5);
    expect(results.get('n2')!.layer).toBe(5);
    expect(results.get('n3')!.layer).toBe(5);
  });
});
