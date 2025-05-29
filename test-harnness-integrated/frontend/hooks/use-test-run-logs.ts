import { client } from '@/lib/api';

export function useTestRunLogs(
  systemId: string,
  profileConfigurationId: string,
  testRunId: number,
  enabled: boolean = true
) {
  const { data: response, isLoading, error } = client.getTestRunLogs.useQuery({
    queryKey: ['test-run-logs', systemId, profileConfigurationId, testRunId],
    queryData: {
      params: {
        systemId,
        profileConfigurationId,
        id: testRunId.toString()
      }
    },
    enabled
  });

  const logs = response?.body?.logs;

  return {
    logs,
    isLoading,
    error,
    isNotFound: !isLoading && !error && !logs
  };
}