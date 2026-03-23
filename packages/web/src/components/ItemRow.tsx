import type { Item } from '../types';

const LAYER_STYLES: Record<number, { bg: string; weight: string; opacity: string; accent?: string }> = {
  1: { bg: '#FFFFFF', weight: '600', opacity: '1', accent: '#C2553A' },
  2: { bg: 'transparent', weight: '500', opacity: '1' },
  3: { bg: 'transparent', weight: '400', opacity: '0.75' },
  4: { bg: 'transparent', weight: '400', opacity: '0.55' },
};

function TypeBadge({ item }: { item: Item }) {
  const isPR = item.type === 'pr';
  let color = '#6B6B63';

  if (item.state === 'merged') color = '#8250DF';
  else if (item.state === 'closed') color = '#CF222E';
  else if (item.state === 'open') color = isPR ? '#1A7F37' : '#1A7F37';

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
      {isPR ? (
        // Git PR icon
        <path d="M5.5 3.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0ZM6 3.5a2.5 2.5 0 1 1-3.5 2.293v4.414A2.501 2.501 0 0 1 4 15a2.5 2.5 0 0 1-1.5-4.793V5.793A2.501 2.501 0 0 1 4 1a2.5 2.5 0 0 1 2 3.5ZM4 13.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8-10a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0ZM12 1a2.5 2.5 0 0 1 .5 4.95v4.1A2.501 2.501 0 0 1 12 15a2.5 2.5 0 0 1-.5-4.95v-4.1A2.501 2.501 0 0 1 12 1Zm0 12.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      ) : (
        // Issue icon
        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm9 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-.25-6.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Z" />
      )}
    </svg>
  );
}

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

interface ItemRowProps {
  item: Item;
  showLayer?: boolean;
}

export default function ItemRow({ item, showLayer }: ItemRowProps) {
  const style = LAYER_STYLES[item.layer] ?? LAYER_STYLES[4];
  const labels: string[] = JSON.parse(item.labels || '[]');

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-black/[0.02]"
      style={{
        backgroundColor: style.bg,
        opacity: style.opacity,
        borderBottom: '1px solid #F0EFEB',
      }}
    >
      <div className="pt-0.5 flex-shrink-0">
        <TypeBadge item={item} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm truncate"
            style={{ fontWeight: style.weight, color: '#1B1B18' }}
          >
            {item.title}
          </span>
          {item.is_draft ? (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0" style={{ color: '#9F9F97', backgroundColor: '#F0EFEB' }}>
              Draft
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-xs"
            style={{ color: '#6B6B63', fontFamily: '"Geist Mono", ui-monospace, monospace' }}
          >
            {item.repo_owner}/{item.repo_name}#{item.number}
          </span>

          <span className="text-xs" style={{ color: '#9F9F97' }}>
            {item.author_login}
          </span>

          {labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ color: '#6B6B63', backgroundColor: '#F0EFEB' }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
        {item.comment_count > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#9F9F97' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25v-7.5Z" />
            </svg>
            {item.comment_count}
          </span>
        )}

        {showLayer && (
          <span
            className="text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              backgroundColor: item.layer === 1 ? '#C2553A' : '#F0EFEB',
              color: item.layer === 1 ? '#FFFFFF' : '#6B6B63',
            }}
          >
            {item.layer}
          </span>
        )}

        <span className="text-xs tabular-nums" style={{ color: '#9F9F97', fontFamily: '"Geist Mono", ui-monospace, monospace' }}>
          {formatRelative(item.updated_at)}
        </span>
      </div>
    </a>
  );
}
