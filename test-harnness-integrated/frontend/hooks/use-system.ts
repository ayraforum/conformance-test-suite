import { client } from '@/lib/api';

export function useSystem(systemId: string) {
  const { data: response, isLoading, error } = client.getSystem.useQuery({
    queryKey: ['system', systemId],
    queryData: { params: { id: systemId } }
  });

  const system = response?.body;

  return {
    system,
    isLoading,
    error,
    isNotFound: !isLoading && !error && !system
  };
}