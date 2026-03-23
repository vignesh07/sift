import { useItems } from '../hooks/useItems';
import type { StatusResponse } from '../types';
import ItemRow from './ItemRow';

const LAYER_META: Record<number, { label: string; description: string; labelColor: string; countColor: string; descColor: string }> = {
  1: { label: 'Needs You', description: 'Review requests, mentions, your repos', labelColor: '#C2553A', countColor: '#C2553A', descColor: '#9F9F97' },
  2: { label: 'Your Circle', description: 'People you follow, maintainers of starred repos', labelColor: '#1B1B18', countColor: '#6B6B63', descColor: '#9F9F97' },
  3: { label: 'Rising', description: 'Repeat contributors, unusual engagement', labelColor: '#9F9F97', countColor: '#B5B5AD', descColor: '#B5B5AD' },
  4: { label: 'Everything Else', description: 'Filtered out bots, spam, and noise', labelColor: '#C8C8C0', countColor: '#D0D0C8', descColor: '#C8C8C0' },
};

interface FeedViewProps {
  status: StatusResponse;
}

function LayerSection({ layer, status }: { layer: number; status: StatusResponse }) {
  const { data, isLoading } = useItems(layer);
  const meta = LAYER_META[layer];
  const count = status.itemCounts[layer] ?? 0;
  const maxShow = layer <= 2 ? 50 : 3;

  if (count === 0 && !isLoading) return null;

  const items = data?.items.slice(0, maxShow) ?? [];
  const remaining = count - items.length;

  return (
    <div>
      {/* Layer header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingLeft: 80,
        paddingRight: 80,
        paddingTop: layer === 1 ? 40 : 48,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.06em',
            lineHeight: '16px',
            textTransform: 'uppercase' as const,
            color: meta.labelColor,
          }}>
            {meta.label}
          </span>
          <span style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: '16px',
            color: meta.countColor,
          }}>
            {count}
          </span>
        </div>
        <span style={{
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: 12,
          lineHeight: '16px',
          color: meta.descColor,
        }}>
          {meta.description}
        </span>
      </div>

      {/* Items */}
      <div style={{ padding: '16px 80px 0', display: 'flex', flexDirection: 'column', gap: layer === 1 ? 4 : 0 }}>
        {isLoading ? (
          <div style={{ paddingBlock: 20, textAlign: 'center' }}>
            <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12, color: '#C8C8C0' }}>Loading...</span>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            {remaining > 0 && (
              <div style={{ textAlign: 'center', paddingTop: 12 }}>
                <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12, color: '#B5B5AD' }}>
                  {remaining} more in this layer
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function FeedView({ status }: FeedViewProps) {
  const totalItems = Object.values(status.itemCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      {[1, 2, 3, 4].map((layer) => (
        <LayerSection key={layer} layer={layer} status={status} />
      ))}

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 56,
        paddingBottom: 40,
        paddingInline: 80,
      }}>
        <span style={{
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: 12,
          lineHeight: '16px',
          color: '#C8C8C0',
        }}>
          {totalItems} items across all layers · last sync {status.lastSync ? formatRelative(status.lastSync) : 'never'}
        </span>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) === 1 ? '' : 's'} ago`;
}
