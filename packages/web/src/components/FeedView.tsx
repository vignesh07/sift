import { useEffect, useRef, useState } from 'react';
import { useItems } from '../hooks/useItems';
import type { StatusResponse } from '../types';
import ItemRow from './ItemRow';

type TypeFilter = 'all' | 'pr' | 'issue';

const LAYER_META: Record<number, {
  label: string;
  description: string;
  idleLabelColor: string;
  idleCountColor: string;
  idleDescColor: string;
  activeLabelColor: string;
  activeCountColor: string;
  activeDescColor: string;
  previewCount: number;
  idleOpacity: number;
  activeOpacity: number;
}> = {
  1: {
    label: 'Needs You',
    description: 'Review requests, assignments, your open work',
    idleLabelColor: '#C2553A',
    idleCountColor: '#C2553A',
    idleDescColor: '#9F9F97',
    activeLabelColor: '#C2553A',
    activeCountColor: '#C2553A',
    activeDescColor: '#9F9F97',
    previewCount: 50,
    idleOpacity: 1,
    activeOpacity: 1,
  },
  2: {
    label: 'Your Circle',
    description: 'Maintainers active on repos you own or contribute to',
    idleLabelColor: '#1B1B18',
    idleCountColor: '#6B6B63',
    idleDescColor: '#9F9F97',
    activeLabelColor: '#1B1B18',
    activeCountColor: '#6B6B63',
    activeDescColor: '#9F9F97',
    previewCount: 50,
    idleOpacity: 1,
    activeOpacity: 1,
  },
  3: {
    label: 'Your Repos',
    description: 'Non-maintainer activity on repos you own',
    idleLabelColor: '#1B1B18',
    idleCountColor: '#6B6B63',
    idleDescColor: '#9F9F97',
    activeLabelColor: '#1B1B18',
    activeCountColor: '#6B6B63',
    activeDescColor: '#9F9F97',
    previewCount: 50,
    idleOpacity: 0.92,
    activeOpacity: 1,
  },
  4: {
    label: 'Interesting',
    description: 'Mentions, high engagement, hotter starred repos',
    idleLabelColor: '#9F9F97',
    idleCountColor: '#B5B5AD',
    idleDescColor: '#B5B5AD',
    activeLabelColor: '#5F5F58',
    activeCountColor: '#73736C',
    activeDescColor: '#85857E',
    previewCount: 3,
    idleOpacity: 0.56,
    activeOpacity: 1,
  },
  5: {
    label: 'Everything Else',
    description: 'Background activity and lower-signal starred repos',
    idleLabelColor: '#C8C8C0',
    idleCountColor: '#D0D0C8',
    idleDescColor: '#C8C8C0',
    activeLabelColor: '#7A7A73',
    activeCountColor: '#8E8E87',
    activeDescColor: '#9F9F97',
    previewCount: 3,
    idleOpacity: 0.44,
    activeOpacity: 0.98,
  },
};

interface FeedViewProps {
  status: StatusResponse;
}

function LayerSection({
  layer,
  status,
  typeFilter,
  activeLayer,
  sectionRef,
}: {
  layer: number;
  status: StatusResponse;
  typeFilter: TypeFilter;
  activeLayer: number;
  sectionRef: (node: HTMLDivElement | null) => void;
}) {
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
  const active = activeLayer === layer;
  const headerOpacity = active ? meta.activeOpacity : meta.idleOpacity;
  const labelColor = active ? meta.activeLabelColor : meta.idleLabelColor;
  const countColor = active ? meta.activeCountColor : meta.idleCountColor;
  const descColor = active ? meta.activeDescColor : meta.idleDescColor;

  return (
    <div ref={sectionRef}>
      {/* Layer header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingLeft: 80,
        paddingRight: 80,
        paddingTop: layer === 1 ? 40 : 48,
        opacity: headerOpacity,
        transition: 'opacity 180ms ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.06em',
            lineHeight: '16px',
            textTransform: 'uppercase' as const,
            color: labelColor,
            transition: 'color 180ms ease',
          }}>
            {meta.label}
          </span>
          <span style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: '16px',
            color: countColor,
            transition: 'color 180ms ease',
          }}>
            {count}
          </span>
        </div>
        <span style={{
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: 12,
          lineHeight: '16px',
          color: descColor,
          transition: 'color 180ms ease',
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
              <ItemRow key={item.id} item={item} emphasized={active} />
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
  const [activeLayer, setActiveLayer] = useState(1);
  const totalItems = Object.values(status.itemCounts).reduce((a, b) => a + b, 0);
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
  });

  useEffect(() => {
    setActiveLayer(1);
  }, [typeFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateActiveLayer = () => {
      const focusLine = window.innerHeight * 0.32;
      let nextLayer = 1;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const layer of [1, 2, 3, 4, 5] as const) {
        const node = sectionRefs.current[layer];
        if (!node) {
          continue;
        }

        const rect = node.getBoundingClientRect();
        if (rect.bottom <= 0) {
          continue;
        }

        const topDistance = Math.abs(rect.top - focusLine);
        const inFocusBand = rect.top <= focusLine && rect.bottom >= focusLine;

        if (inFocusBand) {
          nextLayer = layer;
          bestDistance = -1;
          break;
        }

        if (topDistance < bestDistance) {
          bestDistance = topDistance;
          nextLayer = layer;
        }
      }

      setActiveLayer(nextLayer);
    };

    updateActiveLayer();
    window.addEventListener('scroll', updateActiveLayer, { passive: true });
    window.addEventListener('resize', updateActiveLayer);

    return () => {
      window.removeEventListener('scroll', updateActiveLayer);
      window.removeEventListener('resize', updateActiveLayer);
    };
  }, [typeFilter, status.itemCounts]);

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
        <LayerSection
          key={layer}
          layer={layer}
          status={status}
          typeFilter={typeFilter}
          activeLayer={activeLayer}
          sectionRef={(node) => {
            sectionRefs.current[layer] = node;
          }}
        />
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
