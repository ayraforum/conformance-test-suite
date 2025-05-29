import { client } from '@/lib/api';

export function useTestHarnesses() {
  const { data: response, isLoading, error } = client.getTestHarnessesStatus.useQuery({
    queryKey: ['test-harnesses-status'],
    queryData: {}
  });

  const statuses = response?.body;

  return {
    statuses,
    isLoading,
    error,
    isNotFound: !isLoading && !error && !statuses
  };
}