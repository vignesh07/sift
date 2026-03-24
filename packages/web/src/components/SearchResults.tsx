import { useEffect, useState } from 'react';
import { useSearch } from '../hooks/useSearch';
import ItemRow from './ItemRow';

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  const [limit, setLimit] = useState(50);
  const { data, isLoading, isFetching } = useSearch(query, limit);

  useEffect(() => {
    setLimit(50);
  }, [query]);

  if (query.length < 2) return null;

  return (
    <div style={{ padding: '0 80px' }}>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingBlock: 60 }}>
          <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 13, color: '#9F9F97' }}>Searching...</span>
        </div>
      ) : !data?.items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBlock: 60 }}>
          <span style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: 20, color: '#C8C8C0' }}>
            Nothing found.
          </span>
          <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12, color: '#C8C8C0', marginTop: 8 }}>
            No results for "{query}"
          </span>
        </div>
      ) : (
        <>
          <div style={{ paddingTop: 24, paddingBottom: 16 }}>
            <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12, color: '#9F9F97' }}>
              {data.total} result{data.total === 1 ? '' : 's'} for "{query}"
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
          {data.items.length < data.total && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <button
                onClick={() => setLimit((current) => current + 50)}
                disabled={isFetching}
                style={{
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
