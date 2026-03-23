import { useSearch } from '../hooks/useSearch';
import ItemRow from './ItemRow';

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  const { data, isLoading } = useSearch(query);

  if (query.length < 2) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm" style={{ color: '#9F9F97' }}>Searching...</span>
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm" style={{ color: '#9F9F97' }}>
          No results for "{query}"
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="px-5 py-2 text-xs" style={{ color: '#9F9F97', borderBottom: '1px solid #F0EFEB' }}>
        {data.total} result{data.total === 1 ? '' : 's'}
      </div>
      {data.items.map((item) => (
        <ItemRow key={item.id} item={item} showLayer />
      ))}
    </div>
  );
}
