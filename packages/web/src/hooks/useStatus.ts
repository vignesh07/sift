import { useQuery } from '@tanstack/react-query';
import { fetchStatus } from '../api';

export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
    refetchInterval: 10_000,
  });
}
