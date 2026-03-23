import { useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerSync } from '../api';
import type { StatusResponse } from '../types';

function SyncIndicator({ status }: { status: StatusResponse }) {
  const queryClient = useQueryClient();
  const sync = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });

  const lastSync = status.lastSync
    ? formatRelative(status.lastSync)
    : 'never';

  return (
    <button
      onClick={() => sync.mutate()}
      disabled={status.syncInProgress || sync.isPending}
      className="flex items-center gap-1.5 text-xs transition-opacity disabled:opacity-50"
      style={{ color: '#6B6B63' }}
      title={`Last sync: ${lastSync}`}
    >
      <svg
        className={status.syncInProgress || sync.isPending ? 'animate-spin' : ''}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
      <span>{lastSync}</span>
    </button>
  );
}

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
}

export default function Header({ status, view, onViewChange, searchQuery, onSearchChange }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b"
      style={{ backgroundColor: '#F8F7F4', borderColor: '#E5E4E0' }}
    >
      <div className="flex items-center gap-5">
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ color: '#1B1B18', fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          Sift
        </h1>

        {/* View toggle */}
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: '#E5E4E0' }}>
          <button
            onClick={() => onViewChange('tabs')}
            className="px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: view === 'tabs' ? '#1B1B18' : 'transparent',
              color: view === 'tabs' ? '#F8F7F4' : '#6B6B63',
            }}
          >
            Layers
          </button>
          <button
            onClick={() => onViewChange('feed')}
            className="px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: view === 'feed' ? '#1B1B18' : 'transparent',
              color: view === 'feed' ? '#F8F7F4' : '#6B6B63',
            }}
          >
            Feed
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-52 px-3 py-1.5 rounded-md border text-xs outline-none transition-colors focus:border-gray-400"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E5E4E0',
              color: '#1B1B18',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: '#9F9F97' }}
            >
              &times;
            </button>
          )}
        </div>

        <SyncIndicator status={status} />

        {status.user && (
          <span className="text-xs" style={{ color: '#9F9F97', fontFamily: '"Geist Mono", ui-monospace, monospace' }}>
            {status.user}
          </span>
        )}
      </div>
    </header>
  );
}
