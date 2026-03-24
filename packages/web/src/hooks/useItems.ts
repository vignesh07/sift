import { useQuery } from '@tanstack/react-query';
import { fetchItems, fetchFeed } from '../api';

interface UseItemsOptions {
  layer?: number;
  type?: 'pr' | 'issue';
  state?: 'open' | 'closed' | 'merged';
  sort?: 'updated_at' | 'created_at' | 'comment_count' | 'reaction_count';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function useItems(options: UseItemsOptions = {}) {
  return useQuery({
    queryKey: ['items', options],
    queryFn: () => fetchItems(options),
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
