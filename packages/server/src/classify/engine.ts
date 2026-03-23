import type { SearchItem } from '../github/search.js';

export interface ClassificationContext {
  username: string;
  following: Set<string>;
  starredRepos: Set<string>; // "owner/name" format
  userRepos: Set<string>;    // "owner/name" format
  ownedRepos: Set<string>;   // "owner/name" format — repos user is admin of
}

export interface ClassificationResult {
  layer: 1 | 2 | 3 | 4;
  reasons: string[];
}

/**
 * Classify an item into a layer (1-4) based on signal priority.
 *
 * Layer 1 — Needs You: direct action required from the user
 * Layer 2 — Your Circle: people/repos you care about
 * Layer 3 — Rising: high engagement signals
 * Layer 4 — Everything Else
 */
export function classify(
  item: SearchItem & { notification_reason?: string | null },
  ctx: ClassificationContext,
): ClassificationResult {
  const reasons: string[] = [];
  const repoKey = `${item.repo_owner}/${item.repo_name}`;

  // --- Layer 1 checks ---

  // Review requested for you
  if (item.requested_reviewers.includes(ctx.username)) {
    reasons.push('review_requested');
  }

  // Notification reason is review_requested
  if (item.notification_reason === 'review_requested') {
    reasons.push('notification_review_requested');
  }

  // @mention
  if (item.notification_reason === 'mention') {
    reasons.push('mentioned');
  }

  // Assigned to you
  if (item.notification_reason === 'assign') {
    reasons.push('assigned');
  }

  // PR on a repo you own
  if (item.type === 'pr' && ctx.ownedRepos.has(repoKey) && item.author_login !== ctx.username) {
    reasons.push('pr_on_owned_repo');
  }

  // Your PR with changes requested
  if (
    item.type === 'pr' &&
    item.author_login === ctx.username &&
    item.review_decision === 'CHANGES_REQUESTED'
  ) {
    reasons.push('your_pr_changes_requested');
  }

  // Your open PR (needs your attention)
  if (item.type === 'pr' && item.author_login === ctx.username && item.state === 'open') {
    reasons.push('your_open_pr');
  }

  if (reasons.length > 0) {
    return { layer: 1, reasons };
  }

  // --- Layer 2 checks ---

  // Author is someone you follow
  if (ctx.following.has(item.author_login)) {
    reasons.push('author_followed');
  }

  // On a starred repo
  if (ctx.starredRepos.has(repoKey)) {
    reasons.push('starred_repo');
  }

  // On a repo you contribute to (but don't own)
  if (ctx.userRepos.has(repoKey) && !ctx.ownedRepos.has(repoKey)) {
    reasons.push('contributor_repo');
  }

  if (reasons.length > 0) {
    return { layer: 2, reasons };
  }

  // --- Layer 3 checks ---

  if (item.comment_count >= 10) {
    reasons.push('high_comments');
  }

  if (item.reaction_count >= 10) {
    reasons.push('high_reactions');
  }

  if (item.participant_count >= 5) {
    reasons.push('many_participants');
  }

  if (reasons.length > 0) {
    return { layer: 3, reasons };
  }

  // --- Layer 4 ---
  return { layer: 4, reasons: ['no_special_signals'] };
}

/**
 * Classify a batch of items, with additional batch-level heuristics
 * (e.g. prolific authors get a layer bump).
 */
export function classifyBatch(
  items: (SearchItem & { notification_reason?: string | null })[],
  ctx: ClassificationContext,
): Map<string, ClassificationResult> {
  // Count items per author for "prolific author" heuristic
  const authorCounts = new Map<string, number>();
  for (const item of items) {
    authorCounts.set(item.author_login, (authorCounts.get(item.author_login) ?? 0) + 1);
  }

  const results = new Map<string, ClassificationResult>();

  for (const item of items) {
    let result = classify(item, ctx);

    // Prolific author: if an author has 3+ items in this batch and the item
    // was classified as Layer 4, bump to Layer 3
    if (result.layer === 4 && (authorCounts.get(item.author_login) ?? 0) >= 3) {
      result = { layer: 3, reasons: ['prolific_author'] };
    }

    results.set(item.id, result);
  }

  return results;
}
