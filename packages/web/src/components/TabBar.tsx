interface TabBarProps {
  activeLayer: number;
  onLayerChange: (layer: number) => void;
  counts: Record<number, number>;
}

const LAYER_NAMES: Record<number, string> = {
  1: 'Needs You',
  2: 'Your Circle',
  3: 'Rising',
  4: 'Everything',
};

export default function TabBar({ activeLayer, onLayerChange, counts }: TabBarProps) {
  return (
    <div
      className="flex border-b px-5"
      style={{ borderColor: '#E5E4E0' }}
    >
      {[1, 2, 3, 4].map((layer) => {
        const active = activeLayer === layer;
        return (
          <button
            key={layer}
            onClick={() => onLayerChange(layer)}
            className="relative flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors"
            style={{
              color: active ? '#1B1B18' : '#9F9F97',
            }}
          >
            <span>{LAYER_NAMES[layer]}</span>
            {counts[layer] > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full tabular-nums"
                style={{
                  backgroundColor: layer === 1 && active ? '#C2553A' : '#F0EFEB',
                  color: layer === 1 && active ? '#FFFFFF' : '#6B6B63',
                  fontFamily: '"Geist Mono", ui-monospace, monospace',
                }}
              >
                {counts[layer]}
              </span>
            )}
            {active && (
              <div
                className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                style={{ backgroundColor: layer === 1 ? '#C2553A' : '#1B1B18' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
