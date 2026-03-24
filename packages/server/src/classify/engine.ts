import type { SearchItem } from '../github/search.js';

export interface ClassificationContext {
  username: string;
  following: Set<string>;
  starredRepos: Set<string>;           // "owner/name" format
  userRepos: Set<string>;              // "owner/name" format — repos user contributes to
  ownedRepos: Set<string>;             // "owner/name" format — repos user is ADMIN of (Layer 1)
  maintainerRepos: Set<string>;        // "owner/name" format — repos with ADMIN/MAINTAIN/WRITE (Layer 3)
  maintainerRepoCollaborators: Set<string>; // logins who are collaborators on maintainer repos
}

export interface ClassificationResult {
  layer: 1 | 2 | 3 | 4 | 5;
  reasons: string[];
}

/**
 * Classify an item into a layer (1-5) based on signal priority.
 *
 * Layer 1 — Needs You: direct action required from the user
 *   - Review requested for you
 *   - Assigned to you
 *   - PRs on repos you own (from others)
 *   - Your PRs with changes requested
 *   - Your open PRs
 *
 * Layer 2 — Your Circle: people you deliberately track
 *   - Author is someone you follow on a repo you contribute to
 *
 * Layer 3 — Your Repos: fellow maintainers active on repos you own
 *   - Author is a collaborator on a repo you own, item is on a repo you own
 *
 * Layer 4 — Interesting: worth a look
 *   - @mentions
 *   - High engagement (comments, reactions, participants)
 *   - Activity on a starred repo when paired with another Layer 4 signal
 *   - Prolific author in batch (applied in classifyBatch)
 *
 * Layer 5 — Everything Else
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

  if (
    ctx.following.has(item.author_login) &&
    ctx.userRepos.has(repoKey) &&
    item.author_login !== ctx.username
  ) {
    reasons.push('author_followed');
  }

  if (reasons.length > 0) {
    return { layer: 2, reasons };
  }

  // --- Layer 3: Your Repos (fellow maintainers on repos you maintain) ---

  if (
    ctx.maintainerRepos.has(repoKey) &&
    ctx.maintainerRepoCollaborators.has(item.author_login) &&
    item.author_login !== ctx.username
  ) {
    reasons.push('maintainer_on_owned_repo');
  }

  if (reasons.length > 0) {
    return { layer: 3, reasons };
  }

  // --- Layer 4: Interesting ---

  const starredRepo = ctx.starredRepos.has(repoKey);

  if (item.notification_reason === 'mention') {
    reasons.push('mentioned');
  }

  if (starredRepo) {
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

  const strongLayer4Reasons = reasons.filter(reason => reason !== 'starred_repo');

  if (strongLayer4Reasons.length > 0) {
    return { layer: 4, reasons };
  }

  // --- Layer 5 ---
  if (starredRepo) {
    return { layer: 5, reasons: ['starred_repo'] };
  }

  return { layer: 5, reasons: ['no_special_signals'] };
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

    // Prolific author: 3+ items in batch and currently Layer 5 → bump to Layer 4
    if (result.layer === 5 && (authorCounts.get(item.author_login) ?? 0) >= 3) {
      result = { layer: 4, reasons: ['prolific_author'] };
    }

    results.set(item.id, result);
  }

  return results;
}
