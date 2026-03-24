import { useQuery } from '@tanstack/react-query';
import { searchItems } from '../api';

export function useSearch(query: string, limit = 50) {
  return useQuery({
    queryKey: ['search', query, limit],
    queryFn: () => searchItems(query, { limit }),
    enabled: query.length >= 2,
    placeholderData: (prev) => prev,
  });
}
