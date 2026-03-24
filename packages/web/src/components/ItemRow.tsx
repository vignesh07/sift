import type { Item } from '../types';

// Per-layer styling pulled directly from Paper mockup
const LAYER_CONFIG: Record<number, {
  bg: string;
  iconColor: string;
  titleColor: string;
  titleWeight: number;
  repoColor: string;
  authorColor: string;
  metaColor: string;
  timeColor: string;
  chevronColor: string;
  paddingBlock: number;
}> = {
  1: {
    bg: '#FFFFFF',
    iconColor: '#C2553A',
    titleColor: '#1B1B18',
    titleWeight: 500,
    repoColor: '#9F9F97',
    authorColor: '#6B6B63',
    metaColor: '#9F9F97',
    timeColor: '#B5B5AD',
    chevronColor: '#C8C8C0',
    paddingBlock: 16,
  },
  2: {
    bg: 'transparent',
    iconColor: '#6B6B63',
    titleColor: '#1B1B18',
    titleWeight: 500,
    repoColor: '#9F9F97',
    authorColor: '#6B6B63',
    metaColor: '#B5B5AD',
    timeColor: '#B5B5AD',
    chevronColor: '#D0D0C8',
    paddingBlock: 14,
  },
  3: {
    bg: 'transparent',
    iconColor: '#B5B5AD',
    titleColor: '#4A4A44',
    titleWeight: 400,
    repoColor: '#B5B5AD',
    authorColor: '#9F9F97',
    metaColor: '#C8C8C0',
    timeColor: '#C8C8C0',
    chevronColor: '#D8D8D0',
    paddingBlock: 14,
  },
  4: {
    bg: 'transparent',
    iconColor: '#B5B5AD',
    titleColor: '#4A4A44',
    titleWeight: 400,
    repoColor: '#B5B5AD',
    authorColor: '#9F9F97',
    metaColor: '#C8C8C0',
    timeColor: '#C8C8C0',
    chevronColor: '#D8D8D0',
    paddingBlock: 14,
  },
  5: {
    bg: 'transparent',
    iconColor: '#D0D0C8',
    titleColor: '#9F9F97',
    titleWeight: 400,
    repoColor: '#C8C8C0',
    authorColor: '#B5B5AD',
    metaColor: '#D0D0C8',
    timeColor: '#D0D0C8',
    chevronColor: '#D8D8D0',
    paddingBlock: 12,
  },
};

// SVG paths for PR and Issue icons
const PR_PATH = 'M7.177 3.073L9.573.677A.25.25 0 0 1 10 .854v4.792a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354zM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25zM11 2.5h-1V4h1a1 1 0 0 1 1 1v5.628a2.251 2.251 0 1 1-1.5 0V5a2.5 2.5 0 0 0-2.5-2.5zm1 10.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0zM3.75 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z';

const ISSUE_PATH_1 = 'M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z';
const ISSUE_PATH_2 = 'M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function getReasonLabel(item: Item): string | null {
  const reasons: string[] = JSON.parse(item.layer_reasons || '[]');
  // Layer 1
  if (reasons.includes('review_requested') || reasons.includes('notification_review_requested')) return 'requested your review';
  if (reasons.includes('assigned')) return 'assigned to you';
  if (reasons.includes('pr_on_owned_repo')) return 'opened a PR on your repo';
  if (reasons.includes('your_pr_changes_requested')) return 'changes requested';
  if (reasons.includes('your_open_pr')) return 'your PR';
  // Layer 2
  if (reasons.includes('author_followed')) return 'you follow';
  if (reasons.includes('owned_repo_collaborator')) return 'maintainer';
  // Layer 3
  if (reasons.includes('maintainer_on_owned_repo')) return 'maintainer';
  // Layer 4
  if (reasons.includes('mentioned')) return 'mentioned you';
  if (reasons.includes('starred_repo')) return 'starred repo';
  if (reasons.includes('high_comments')) return `${item.comment_count} comments`;
  if (reasons.includes('high_reactions')) return `${item.reaction_count} reactions`;
  if (reasons.includes('many_participants')) return `${item.participant_count} participants`;
  if (reasons.includes('prolific_author')) return 'repeat contributor';
  return null;
}

interface ItemRowProps {
  item: Item;
}

export default function ItemRow({ item }: ItemRowProps) {
  const cfg = LAYER_CONFIG[item.layer] ?? LAYER_CONFIG[5];
  const isPR = item.type === 'pr';
  const reasonLabel = getReasonLabel(item);
  const showChevron = item.layer !== 5;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        paddingBlock: cfg.paddingBlock,
        paddingInline: 20,
        borderRadius: 10,
        backgroundColor: cfg.bg,
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Type icon */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill={cfg.iconColor} style={{ flexShrink: 0, marginTop: 2 }}>
        {isPR ? (
          <path d={PR_PATH} />
        ) : (
          <>
            <path d={ISSUE_PATH_1} />
            <path d={ISSUE_PATH_2} />
          </>
        )}
      </svg>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', gap: item.layer === 5 ? 3 : 4, minWidth: 0 }}>
        {/* Title + repo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: 14,
            fontWeight: cfg.titleWeight,
            lineHeight: '18px',
            color: cfg.titleColor,
          }}>
            {item.title}
          </span>
          <span style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 11,
            lineHeight: '14px',
            color: cfg.repoColor,
            flexShrink: 0,
          }}>
            {item.repo_owner}/{item.repo_name}
          </span>
        </div>

        {/* Author + reason + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: 12,
            lineHeight: '16px',
            color: cfg.authorColor,
          }}>
            {item.author_login}
          </span>
          {reasonLabel && (
            <span style={{
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: 11,
              lineHeight: '14px',
              color: cfg.metaColor,
            }}>
              {reasonLabel}
            </span>
          )}
          <span style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 11,
            lineHeight: '14px',
            color: cfg.timeColor,
          }}>
            {formatRelative(item.updated_at)}
          </span>
        </div>
      </div>

      {/* Chevron */}
      {showChevron && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cfg.chevronColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 4 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </a>
  );
}
