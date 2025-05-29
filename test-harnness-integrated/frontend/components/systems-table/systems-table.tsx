import { useRouter } from 'next/navigation';
import { DataTable } from "@/components/data-table";
import { columns } from "./columns";
import { useSystems } from "./use-systems";
import { Button } from "@/components/ui/button";

export function SystemsTable() {
  const router = useRouter();
  const {
    data: systems,
    isLoading,
    pagination,
    onPaginationChange
  } = useSystems();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Systems</h2>
        <Button onClick={() => router.push('/systems/new')}>Create System</Button>
      </div>
      <DataTable
        data={systems}
        columns={columns}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        onRowClick={(row) => router.push(`/systems/${row.original.id}`)}
      />
    </div>
  );
}