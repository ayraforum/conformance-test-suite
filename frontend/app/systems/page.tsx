'use client';

import { DataTable } from "@/components/data-table";
import { useTableQuery } from "@/hooks/use-table-query";
import { client } from "@/lib/api";
import { System } from "@conformance-test-suite/shared/src/systemContract";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

const columns: ColumnDef<System>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "version",
    header: "Version",
  },
  {
    accessorKey: "endpoint",
    header: "Endpoint",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const system = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(system.name)}
            >
              Copy system name
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View system details</DropdownMenuItem>
            {/* Add more actions as needed */}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
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