import { useQuery } from '@tanstack/react-query';
import { fetchItems, fetchFeed } from '../api';

export function useItems(layer?: number) {
  return useQuery({
    queryKey: ['items', { layer }],
    queryFn: () => fetchItems({ layer }),
    refetchInterval: 30_000,
  });
}

export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: () => fetchFeed(),
    refetchInterval: 30_000,
  });
}
