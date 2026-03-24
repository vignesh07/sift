import { useEffect, useState } from 'react';
import { useItems } from '../hooks/useItems';
import type { StatusResponse } from '../types';
import TabBar from './TabBar';
import ItemRow from './ItemRow';

const LAYER_DESCRIPTIONS: Record<number, string> = {
  1: 'Review requests, assignments, and activity on your repos',
  2: 'People you follow on repos you contribute to',
  3: 'Fellow maintainers active on repos you own',
  4: 'Mentions, starred repos, high engagement',
  5: 'No special signals',
};

interface LayerViewProps {
  status: StatusResponse;
}

type TypeFilter = 'all' | 'pr' | 'issue';

export default function LayerView({ status }: LayerViewProps) {
  const [layer, setLayer] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [limit, setLimit] = useState(50);
  const itemType = typeFilter === 'all' ? undefined : typeFilter;
  const { data, isLoading, isFetching } = useItems({ layer, type: itemType, limit });

  useEffect(() => {
    setLimit(50);
  }, [layer, typeFilter]);

  return (
    <div>
      <TabBar
        activeLayer={layer}
        onLayerChange={setLayer}
        counts={status.itemCounts}
      />

      <div style={{ padding: '0 80px' }}>
        {/* Section description + type filter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, paddingBottom: 16 }}>
          <span style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: 12,
            lineHeight: '16px',
            color: '#9F9F97',
          }}>
            {LAYER_DESCRIPTIONS[layer]}
          </span>
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

        {/* Items */}
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: 80 }}>
            <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 13, color: '#9F9F97' }}>Loading...</span>
          </div>
        ) : data?.items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBlock: 80 }}>
            <span style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: 20, color: '#C8C8C0' }}>
              Nothing here.
            </span>
            <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12, color: '#C8C8C0', marginTop: 8 }}>
              Sync to pull in your GitHub activity
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: layer === 1 ? 4 : 0 }}>
            {data?.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}

            {data && data.items.length < data.total && (
              <button
                onClick={() => setLimit((current) => current + 50)}
                disabled={isFetching}
                style={{
                  marginTop: 20,
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

            {/* Done state */}
            {data && data.items.length > 0 && data.items.length >= data.total && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48, paddingBottom: 32 }}>
                <span style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: 20, color: '#C8C8C0' }}>
                  That's everything.
                </span>
                <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12, color: '#C8C8C0', marginTop: 8 }}>
                  {data.total} item{data.total === 1 ? '' : 's'} {layer === 1 ? 'need you' : `in this layer`}
                  {layer < 5 && ` · Next layer has ${status.itemCounts[layer + 1] ?? 0} more`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
