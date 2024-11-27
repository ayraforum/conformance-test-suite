import { useRouter } from 'next/navigation';
import { DataTable } from "@/components/data-table";
import { columns } from "./columns";
import { useProfileConfigurations } from "./use-profile-configurations";
import { Button } from "@/components/ui/button";

interface ProfileConfigurationsTableProps {
  systemId: string;
}

export function ProfileConfigurationsTable({ systemId }: ProfileConfigurationsTableProps) {
  const router = useRouter();
  const {
    data: profileConfigurations,
    isLoading,
    pagination,
    onPaginationChange
  } = useProfileConfigurations(systemId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Profile Configurations</h2>
        <Button onClick={() => router.push(`/systems/${systemId}/profile-configurations/new`)}>
          Create Profile Configuration
        </Button>
      </div>
      <DataTable
        data={profileConfigurations}
        columns={columns}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        onRowClick={(row) => router.push(`/systems/${systemId}/profile-configurations/${row.original.id}`)}
      />
    </div>
  );
}