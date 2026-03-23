import type { SearchItem } from '../github/search.js';

export interface ClassificationContext {
  username: string;
  following: Set<string>;
  starredRepos: Set<string>;       // "owner/name" format
  userRepos: Set<string>;          // "owner/name" format — repos user contributes to
  ownedRepos: Set<string>;         // "owner/name" format — repos user is admin of
  ownedRepoCollaborators: Set<string>; // logins who are collaborators on owned repos
}

export interface ClassificationResult {
  layer: 1 | 2 | 3 | 4;
  reasons: string[];
}

/**
 * Classify an item into a layer (1-4) based on signal priority.
 *
 * Layer 1 — Needs You: direct action required from the user
 *   - Review requested for you
 *   - Assigned to you
 *   - PRs on repos you own (from others)
 *   - Your PRs with changes requested
 *   - Your open PRs
 *
 * Layer 2 — Your Circle: people you deliberately track
 *   - Author is someone you follow
 *   - Author is a collaborator on a repo you own
 *   - On a repo you contribute to
 *
 * Layer 3 — Interesting: worth a look
 *   - @mentions
 *   - On a starred repo
 *   - High engagement (comments, reactions, participants)
 *   - Prolific author in batch (applied in classifyBatch)
 *
 * Layer 4 — Everything Else
 */
export function classify(
  item: SearchItem & { notification_reason?: string | null },
  ctx: ClassificationContext,
): ClassificationResult {
  const reasons: string[] = [];
  const repoKey = `${item.repo_owner}/${item.repo_name}`;

  // --- Layer 1: Needs You ---

  if (item.requested_reviewers.includes(ctx.username)) {
    reasons.push('review_requested');
  }

  if (item.notification_reason === 'review_requested') {
    reasons.push('notification_review_requested');
  }

  if (item.notification_reason === 'assign') {
    reasons.push('assigned');
  }

  if (item.type === 'pr' && ctx.ownedRepos.has(repoKey) && item.author_login !== ctx.username) {
    reasons.push('pr_on_owned_repo');
  }

  if (
    item.type === 'pr' &&
    item.author_login === ctx.username &&
    item.review_decision === 'CHANGES_REQUESTED'
  ) {
    reasons.push('your_pr_changes_requested');
  }

  if (item.type === 'pr' && item.author_login === ctx.username && item.state === 'open') {
    reasons.push('your_open_pr');
  }

  if (reasons.length > 0) {
    return { layer: 1, reasons };
  }

  // --- Layer 2: Your Circle ---

  if (ctx.following.has(item.author_login)) {
    reasons.push('author_followed');
  }

  if (ctx.ownedRepoCollaborators.has(item.author_login) && item.author_login !== ctx.username) {
    reasons.push('owned_repo_collaborator');
  }

  if (ctx.userRepos.has(repoKey) && !ctx.ownedRepos.has(repoKey)) {
    reasons.push('contributor_repo');
  }

  if (reasons.length > 0) {
    return { layer: 2, reasons };
  }

  // --- Layer 3: Interesting ---

  if (item.notification_reason === 'mention') {
    reasons.push('mentioned');
  }

  if (ctx.starredRepos.has(repoKey)) {
    reasons.push('starred_repo');
  }

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
  const authorCounts = new Map<string, number>();
  for (const item of items) {
    authorCounts.set(item.author_login, (authorCounts.get(item.author_login) ?? 0) + 1);
  }

  const results = new Map<string, ClassificationResult>();

  for (const item of items) {
    let result = classify(item, ctx);

    // Prolific author: 3+ items in batch and currently Layer 4 → bump to Layer 3
    if (result.layer === 4 && (authorCounts.get(item.author_login) ?? 0) >= 3) {
      result = { layer: 3, reasons: ['prolific_author'] };
    }

    results.set(item.id, result);
  }

  return results;
}
