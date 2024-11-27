import { client } from '@/lib/api';

export function useProfileConfiguration(systemId: string, profileConfigurationId: string) {
  const { data: response, isLoading, error } = client.getProfileConfiguration.useQuery({
    queryKey: ['profile-configuration', systemId, profileConfigurationId],
    queryData: { params: { systemId: systemId, id: profileConfigurationId } }
  });

  const profileConfiguration = response?.body;

  return {
    profileConfiguration,
    isLoading,
    error,
    isNotFound: !isLoading && !error && !profileConfiguration
  };
}