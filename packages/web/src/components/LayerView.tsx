import { useState } from 'react';
import { useItems } from '../hooks/useItems';
import type { StatusResponse } from '../types';
import TabBar from './TabBar';
import ItemRow from './ItemRow';

const LAYER_DESCRIPTIONS: Record<number, string> = {
  1: 'Review requests, assignments, and activity on your repos',
  2: 'People you follow, maintainers of your repos',
  3: 'Mentions, starred repos, high engagement',
  4: 'No special signals',
};

interface LayerViewProps {
  status: StatusResponse;
}

export default function LayerView({ status }: LayerViewProps) {
  const [layer, setLayer] = useState(1);
  const { data, isLoading } = useItems(layer);

  return (
    <div>
      <TabBar
        activeLayer={layer}
        onLayerChange={setLayer}
        counts={status.itemCounts}
      />

      <div style={{ padding: '0 80px' }}>
        {/* Section description */}
        <div style={{ paddingTop: 24, paddingBottom: 16 }}>
          <span style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: 12,
            lineHeight: '16px',
            color: '#9F9F97',
          }}>
            {LAYER_DESCRIPTIONS[layer]}
          </span>
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

            {/* Done state */}
            {data && data.items.length > 0 && data.items.length >= data.total && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48, paddingBottom: 32 }}>
                <span style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: 20, color: '#C8C8C0' }}>
                  That's everything.
                </span>
                <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12, color: '#C8C8C0', marginTop: 8 }}>
                  {status.itemCounts[layer] ?? 0} item{(status.itemCounts[layer] ?? 0) === 1 ? '' : 's'} {layer === 1 ? 'need you' : `in this layer`}
                  {layer < 4 && ` · Next layer has ${status.itemCounts[layer + 1] ?? 0} more`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
