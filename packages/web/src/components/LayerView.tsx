import { useState } from 'react';
import { useItems } from '../hooks/useItems';
import type { StatusResponse } from '../types';
import TabBar from './TabBar';
import ItemRow from './ItemRow';

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

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm" style={{ color: '#9F9F97' }}>Loading...</span>
          </div>
        ) : data?.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-sm" style={{ color: '#9F9F97' }}>
              Nothing here yet
            </span>
            <span className="text-xs mt-1" style={{ color: '#C8C8C0' }}>
              Sync to pull in your GitHub activity
            </span>
          </div>
        ) : (
          data?.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}
