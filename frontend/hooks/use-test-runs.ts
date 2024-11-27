import { client } from '@/lib/api';

export function useTestRuns(systemId: string, profileConfigurationId: string) {
  const { data: response, isLoading, error } = client.getTestRuns.useQuery({
    queryKey: ['test-runs', systemId, profileConfigurationId],
    queryData: { params: { systemId, profileConfigurationId } }
  });

  const testRuns = response?.body;

  return {
    testRuns,
    isLoading,
    error,
    isNotFound: !isLoading && !error && !testRuns
  };
}