import { useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerSync } from '../api';
import type { StatusResponse } from '../types';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface HeaderProps {
  status: StatusResponse;
  view: 'tabs' | 'feed';
  onViewChange: (v: 'tabs' | 'feed') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
}

export default function Header({ status, view, onViewChange, searchQuery, onSearchChange, searchOpen, onSearchOpenChange }: HeaderProps) {
  const queryClient = useQueryClient();
  const sync = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });

  const syncing = status.syncInProgress || sync.isPending;
  const lastSync = status.lastSync ? formatRelative(status.lastSync) : 'never';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 80,
        paddingRight: 80,
        paddingTop: 32,
        paddingBottom: 28,
        borderBottom: '1px solid rgba(27,27,24,0.06)',
      }}
    >
      {/* Left: Logo + sync status + sync button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 28,
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
            lineHeight: '34px',
            color: '#1B1B18',
          }}
        >
          Sift
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11,
              letterSpacing: '0.05em',
              lineHeight: '14px',
              textTransform: 'uppercase' as const,
              color: '#9F9F97',
            }}
          >
            {syncing ? 'Syncing...' : `Synced ${lastSync}`}
          </span>
          <button
            onClick={() => sync.mutate()}
            disabled={syncing}
            style={{
              background: 'none',
              border: 'none',
              padding: 2,
              cursor: syncing ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: syncing ? 0.4 : 0.6,
            }}
            title="Sync now"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9F9F97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={syncing ? { animation: 'spin 1s linear infinite' } : undefined}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right: View toggle + search + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* View toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(27,27,24,0.04)',
            borderRadius: 8,
            padding: 3,
          }}
        >
          <button
            onClick={() => onViewChange('tabs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: view === 'tabs' ? '#FFFFFF' : 'transparent',
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: '16px',
              color: view === 'tabs' ? '#1B1B18' : '#9F9F97',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={view === 'tabs' ? '#1B1B18' : '#9F9F97'} strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Tabs
          </button>
          <button
            onClick={() => onViewChange('feed')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: view === 'feed' ? '#FFFFFF' : 'transparent',
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: '16px',
              color: view === 'feed' ? '#1B1B18' : '#9F9F97',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={view === 'feed' ? '#1B1B18' : '#9F9F97'} strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Feed
          </button>
        </div>

        {/* Search */}
        {searchOpen ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(27,27,24,0.03)',
              borderRadius: 8,
              padding: '8px 16px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9F9F97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search across all layers..."
              autoFocus
              onBlur={() => { if (!searchQuery) onSearchOpenChange(false); }}
              onKeyDown={(e) => { if (e.key === 'Escape') { onSearchChange(''); onSearchOpenChange(false); } }}
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                fontFamily: '"Inter", system-ui, sans-serif',
                fontSize: 13,
                lineHeight: '16px',
                color: '#1B1B18',
                width: 200,
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => onSearchOpenChange(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(27,27,24,0.03)',
              borderRadius: 8,
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9F9F97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 13, lineHeight: '16px', color: '#9F9F97' }}>
              Search...
            </span>
          </button>
        )}

        {/* User */}
        {status.user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#E8E7E3', flexShrink: 0 }} />
            <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 13, fontWeight: 500, lineHeight: '16px', color: '#6B6B63' }}>
              {status.user}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
