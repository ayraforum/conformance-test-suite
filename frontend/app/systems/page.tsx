'use client';

import { DataTable } from "@/components/data-table";
import { useTableQuery } from "@/hooks/use-table-query";
import { client } from "@/lib/api";
import { System } from "@conformance-test-suite/shared/src/systemContract";
import { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<System>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "version",
    header: "Version",
  },
  {
    accessorKey: "endpoint",
    header: "Endpoint",
  },
];

export default function SystemsPage() {
  const {
    data,
    isLoading,
    pagination,
    onPaginationChange
  } = useTableQuery(client.getSystems, ['systems']);

  return (
    <div className="container mx-auto py-10">
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />
    </div>
  );
}