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
    following: new Set<string>(),
    starredRepos: new Set<string>(),
    userRepos: new Set<string>(),
    ownedRepos: new Set<string>(),
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

    it('classifies @mention', () => {
      const item = makeItem({ notification_reason: 'mention' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(1);
      expect(result.reasons).toContain('mentioned');
    });

    it('classifies assigned', () => {
      const item = makeItem({ notification_reason: 'assign' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(1);
      expect(result.reasons).toContain('assigned');
    });

    it('classifies PR on owned repo', () => {
      const item = makeItem({ type: 'pr', repo_owner: 'me', repo_name: 'my-lib', author_login: 'alice' });
      const ctx = makeCtx({ ownedRepos: new Set(['me/my-lib']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(1);
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
  });

  describe('Layer 2 — Your Circle', () => {
    it('classifies author you follow', () => {
      const item = makeItem({ author_login: 'alice' });
      const ctx = makeCtx({ following: new Set(['alice']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(2);
      expect(result.reasons).toContain('author_followed');
    });

    it('classifies starred repo', () => {
      const item = makeItem({ repo_owner: 'org', repo_name: 'repo' });
      const ctx = makeCtx({ starredRepos: new Set(['org/repo']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(2);
      expect(result.reasons).toContain('starred_repo');
    });

    it('classifies contributor repo', () => {
      const item = makeItem({ repo_owner: 'org', repo_name: 'repo' });
      const ctx = makeCtx({ userRepos: new Set(['org/repo']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(2);
      expect(result.reasons).toContain('contributor_repo');
    });

    it('does NOT classify owned repo as contributor repo (Layer 1 takes priority)', () => {
      const item = makeItem({ type: 'pr', repo_owner: 'me', repo_name: 'repo', author_login: 'bob' });
      const ctx = makeCtx({
        userRepos: new Set(['me/repo']),
        ownedRepos: new Set(['me/repo']),
      });
      const result = classify(item, ctx);
      // Should be Layer 1 because it's a PR on owned repo
      expect(result.layer).toBe(1);
    });

    it('Layer 1 trumps Layer 2', () => {
      const item = makeItem({
        author_login: 'alice',
        notification_reason: 'mention',
      });
      const ctx = makeCtx({ following: new Set(['alice']) });
      const result = classify(item, ctx);
      expect(result.layer).toBe(1);
    });
  });

  describe('Layer 3 — Rising', () => {
    it('classifies high comment count', () => {
      const item = makeItem({ comment_count: 15 });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(3);
      expect(result.reasons).toContain('high_comments');
    });

    it('classifies high reaction count', () => {
      const item = makeItem({ reaction_count: 10 });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(3);
      expect(result.reasons).toContain('high_reactions');
    });

    it('classifies many participants', () => {
      const item = makeItem({ participant_count: 5 });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(3);
      expect(result.reasons).toContain('many_participants');
    });

    it('does not trigger with borderline counts', () => {
      const item = makeItem({ comment_count: 9, reaction_count: 9, participant_count: 4 });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(4);
    });
  });

  describe('Layer 4 — Everything Else', () => {
    it('classifies unmatched items as Layer 4', () => {
      const item = makeItem();
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(4);
      expect(result.reasons).toEqual(['no_special_signals']);
    });

    it('issues with no signals are Layer 4', () => {
      const item = makeItem({ type: 'issue' });
      const result = classify(item, makeCtx());
      expect(result.layer).toBe(4);
    });
  });
});

describe('classifyBatch', () => {
  it('bumps prolific authors from Layer 4 to Layer 3', () => {
    const items = [
      makeItem({ id: 'n1', author_login: 'prolific' }),
      makeItem({ id: 'n2', author_login: 'prolific' }),
      makeItem({ id: 'n3', author_login: 'prolific' }),
    ];
    const results = classifyBatch(items, makeCtx());

    for (const [, result] of results) {
      expect(result.layer).toBe(3);
      expect(result.reasons).toContain('prolific_author');
    }
  });

  it('does NOT bump prolific authors who already have a better layer', () => {
    const items = [
      makeItem({ id: 'n1', author_login: 'prolific', notification_reason: 'mention' }),
      makeItem({ id: 'n2', author_login: 'prolific' }),
      makeItem({ id: 'n3', author_login: 'prolific' }),
    ];
    const results = classifyBatch(items, makeCtx());

    // The mentioned one should stay Layer 1
    expect(results.get('n1')!.layer).toBe(1);
    // Others should be bumped to Layer 3
    expect(results.get('n2')!.layer).toBe(3);
    expect(results.get('n3')!.layer).toBe(3);
  });

  it('handles mixed authors', () => {
    const items = [
      makeItem({ id: 'n1', author_login: 'alice' }),
      makeItem({ id: 'n2', author_login: 'bob' }),
      makeItem({ id: 'n3', author_login: 'alice' }),
    ];
    const results = classifyBatch(items, makeCtx());

    // Alice has 2 items (below threshold), no bump
    expect(results.get('n1')!.layer).toBe(4);
    expect(results.get('n2')!.layer).toBe(4);
    expect(results.get('n3')!.layer).toBe(4);
  });
});
