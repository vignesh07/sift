import { useEffect, useState } from 'react';
import { useItems } from '../hooks/useItems';
import type { StatusResponse } from '../types';
import ItemRow from './ItemRow';

type TypeFilter = 'all' | 'pr' | 'issue';

const LAYER_META: Record<number, { label: string; description: string; labelColor: string; countColor: string; descColor: string; previewCount: number }> = {
  1: { label: 'Needs You', description: 'Review requests, assignments, your repos', labelColor: '#C2553A', countColor: '#C2553A', descColor: '#9F9F97', previewCount: 50 },
  2: { label: 'Your Circle', description: 'People you follow on repos you contribute to', labelColor: '#1B1B18', countColor: '#6B6B63', descColor: '#9F9F97', previewCount: 50 },
  3: { label: 'Your Repos', description: 'Fellow maintainers on repos you maintain', labelColor: '#1B1B18', countColor: '#6B6B63', descColor: '#9F9F97', previewCount: 50 },
  4: { label: 'Interesting', description: 'Mentions, high engagement, hotter starred repos', labelColor: '#9F9F97', countColor: '#B5B5AD', descColor: '#B5B5AD', previewCount: 3 },
  5: { label: 'Everything Else', description: 'Background activity and lower-signal starred repos', labelColor: '#C8C8C0', countColor: '#D0D0C8', descColor: '#C8C8C0', previewCount: 3 },
};

interface FeedViewProps {
  status: StatusResponse;
}

function LayerSection({ layer, status, typeFilter }: { layer: number; status: StatusResponse; typeFilter: TypeFilter }) {
  const [expanded, setExpanded] = useState(false);
  const [limit, setLimit] = useState(LAYER_META[layer].previewCount);
  const meta = LAYER_META[layer];
  const itemType = typeFilter === 'all' ? undefined : typeFilter;
  const { data, isLoading, isFetching } = useItems({ layer, type: itemType, limit });
  const count = data?.total ?? status.itemCounts[layer] ?? 0;

  useEffect(() => {
    setExpanded(false);
    setLimit(meta.previewCount);
  }, [meta.previewCount, typeFilter]);

  useEffect(() => {
    if (expanded && limit < 50) {
      setLimit(50);
    }
  }, [expanded, limit]);

  if (count === 0 && !isLoading) return null;

  const allItems = data?.items ?? [];
  const visibleItems = expanded ? allItems : allItems.slice(0, meta.previewCount);
  const hiddenCount = Math.max(count - meta.previewCount, 0);
  const canExpand = count > meta.previewCount;
  const hasMore = expanded && data ? data.items.length < data.total : false;

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
            {visibleItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            {canExpand && (
              <>
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '12px 0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: '"Inter", system-ui, sans-serif',
                    fontSize: 12,
                    color: '#9F9F97',
                  }}
                >
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="#9F9F97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  {expanded ? 'Show less' : `${hiddenCount} more in this layer`}
                </button>
                {hasMore && data && (
                  <button
                    onClick={() => setLimit((current) => current + 50)}
                    disabled={isFetching}
                    style={{
                      alignSelf: 'center',
                      padding: '10px 16px',
                      borderRadius: 999,
                      border: '1px solid rgba(27,27,24,0.08)',
                      backgroundColor: '#FFFFFF',
                      cursor: isFetching ? 'default' : 'pointer',
                      fontFamily: '"Inter", system-ui, sans-serif',
                      fontSize: 12,
                      color: '#6B6B63',
                      opacity: isFetching ? 0.6 : 1,
                    }}
                  >
                    {isFetching ? 'Loading...' : `Load 50 more (${data.total - data.items.length} left)`}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function FeedView({ status }: FeedViewProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const totalItems = Object.values(status.itemCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Global type filter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 80, paddingTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, backgroundColor: 'rgba(27,27,24,0.03)', borderRadius: 6, padding: 2 }}>
          {(['all', 'pr', 'issue'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: typeFilter === t ? '#FFFFFF' : 'transparent',
                fontFamily: '"Inter", system-ui, sans-serif',
                fontSize: 11,
                fontWeight: typeFilter === t ? 500 : 400,
                lineHeight: '14px',
                color: typeFilter === t ? '#1B1B18' : '#9F9F97',
              }}
            >
              {t === 'all' ? 'Both' : t === 'pr' ? 'PRs' : 'Issues'}
            </button>
          ))}
        </div>
      </div>

      {[1, 2, 3, 4, 5].map((layer) => (
        <LayerSection key={layer} layer={layer} status={status} typeFilter={typeFilter} />
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
