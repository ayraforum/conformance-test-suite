'use client';

import { useParams } from 'next/navigation';
import { useSystem } from '@/hooks/use-system';
import { SystemLoadingState } from '@/components/system-loading-state';
import { ProfileConfigurationsTable } from '@/components/profile-configurations-table';
import { SystemInfoPanel } from '@/components/system-info-panel';

export default function SystemDetailPage() {
  const params = useParams();
  const systemId = params.id as string;
  const { system, isLoading, error, isNotFound } = useSystem(systemId);

  const loadingState = (
    <SystemLoadingState
      isLoading={isLoading}
      error={error}
      isNotFound={isNotFound}
    />
  );

  if (isLoading || error || isNotFound) {
    return loadingState;
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <SystemInfoPanel system={system} />
      <ProfileConfigurationsTable systemId={systemId} />
    </div>
  );
}
