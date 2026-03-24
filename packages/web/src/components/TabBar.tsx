interface TabBarProps {
  activeLayer: number;
  onLayerChange: (layer: number) => void;
  counts: Record<number, number>;
}

const TABS = [
  { layer: 1, label: 'Needs You', activeColor: '#C2553A', inactiveColor: '#6B6B63', badgeBg: 'rgba(194,85,58,0.08)', badgeColor: '#C2553A' },
  { layer: 2, label: 'Your Circle', activeColor: '#1B1B18', inactiveColor: '#6B6B63', badgeBg: 'rgba(27,27,24,0.04)', badgeColor: '#9F9F97' },
  { layer: 3, label: 'Your Repos', activeColor: '#1B1B18', inactiveColor: '#9F9F97', badgeBg: 'rgba(27,27,24,0.04)', badgeColor: '#B5B5AD' },
  { layer: 4, label: 'Interesting', activeColor: '#1B1B18', inactiveColor: '#9F9F97', badgeBg: 'rgba(27,27,24,0.03)', badgeColor: '#B5B5AD' },
  { layer: 5, label: 'Everything Else', activeColor: '#1B1B18', inactiveColor: '#C8C8C0', badgeBg: 'rgba(27,27,24,0.02)', badgeColor: '#D0D0C8' },
];

export default function TabBar({ activeLayer, onLayerChange, counts }: TabBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        paddingInline: 80,
        borderBottom: '1px solid rgba(27,27,24,0.06)',
      }}
    >
      {TABS.map(({ layer, label, activeColor, inactiveColor, badgeBg, badgeColor }) => {
        const active = activeLayer === layer;
        return (
          <button
            key={layer}
            onClick={() => onLayerChange(layer)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingTop: 16,
              paddingBottom: 14,
              paddingLeft: 20,
              paddingRight: 20,
              border: 'none',
              borderBottom: active
                ? `2px solid ${layer === 1 ? '#C2553A' : '#1B1B18'}`
                : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              lineHeight: '16px',
              color: active ? activeColor : inactiveColor,
            }}
          >
            {label}
            {counts[layer] > 0 && (
              <span style={{
                display: 'inline-block',
                paddingBlock: 1,
                paddingInline: 7,
                borderRadius: 10,
                backgroundColor: active && layer === 1 ? 'rgba(194,85,58,0.08)' : badgeBg,
                fontFamily: '"Geist Mono", monospace',
                fontSize: 11,
                fontWeight: active && layer === 1 ? 600 : 500,
                lineHeight: '14px',
                color: active && layer === 1 ? '#C2553A' : badgeColor,
              }}>
                {counts[layer]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
