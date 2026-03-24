import type { SearchItem } from '../github/search.js';

export interface ClassificationContext {
  username: string;
  starredRepos: Set<string>;           // "owner/name" format
  ownedRepos: Set<string>;             // "owner/name" format — repos user is ADMIN of
  maintainerRepos: Set<string>;        // "owner/name" format — repos with ADMIN/MAINTAIN/WRITE
  maintainerRepoCollaborators: Map<string, Set<string>>; // repo -> collaborators with write+ access
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
 *   - Your PRs with changes requested
 *   - Your open PRs
 *   - Your open issues
 *
 * Layer 2 — Your Circle: maintainers active on repos you maintain
 *   - Author is a collaborator on a repo you own or contribute to
 *
 * Layer 3 — Your Repos: other activity on repos you own
 *   - Non-maintainer activity on repos you own
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
  const repoCollaborators = ctx.maintainerRepoCollaborators.get(repoKey) ?? new Set<string>();
  const authorIsMaintainer = repoCollaborators.has(item.author_login) && item.author_login !== ctx.username;

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

  if (item.type === 'issue' && item.author_login === ctx.username && item.state === 'open') {
    reasons.push('your_open_issue');
  }

  if (reasons.length > 0) {
    return { layer: 1, reasons };
  }

  // --- Layer 2: Your Circle ---

  if (ctx.maintainerRepos.has(repoKey) && authorIsMaintainer) {
    reasons.push(ctx.ownedRepos.has(repoKey) ? 'maintainer_on_owned_repo' : 'maintainer_on_contributing_repo');
  }

  if (reasons.length > 0) {
    return { layer: 2, reasons };
  }

  // --- Layer 3: Your Repos (non-maintainer activity on repos you own) ---

  if (ctx.ownedRepos.has(repoKey) && item.author_login !== ctx.username && !authorIsMaintainer) {
    reasons.push(item.type === 'pr' ? 'pr_on_owned_repo' : 'issue_on_owned_repo');
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
