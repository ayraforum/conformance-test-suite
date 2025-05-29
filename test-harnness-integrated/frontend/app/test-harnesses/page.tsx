'use client';

import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTestHarnesses } from '@/hooks/use-test-harnesses';

function getStatusColor(status: TestHarnessStatus): string {
  switch (status) {
    case 'Running':
      return 'text-green-500';
    case 'Stopped':
      return 'text-red-500';
    case 'Starting':
      return 'text-yellow-500';
    default:
      return 'text-foreground';
  }
}

export default function TestHarnessesPage() {
  const { statuses, isLoading, error, isNotFound } = useTestHarnesses();

  if (isLoading || error || isNotFound) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Test Harnesses
      </h1>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Run Time Status</TableHead>
              <TableHead>Revision</TableHead>
              <TableHead>Installation Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(statuses || {})
              .filter(([key]) => !['kind', 'self'].includes(key))
              .map(([name, harness]) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell>
                    <span className={getStatusColor(harness.isRunning ? 'Running' : 'Stopped')}>
                      {harness.isRunning ? 'Running' : 'Stopped'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {harness.currentRevision ?
                      harness.currentRevision.substring(0, 7) :
                      'N/A'}
                  </TableCell>
                  <TableCell>
                    {harness.isInstalled ? 'Installed' : 'Not Installed'}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
