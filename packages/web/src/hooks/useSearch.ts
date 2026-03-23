import { useQuery } from '@tanstack/react-query';
import { searchItems } from '../api';

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchItems(query),
    enabled: query.length >= 2,
    placeholderData: (prev) => prev,
  });
}
