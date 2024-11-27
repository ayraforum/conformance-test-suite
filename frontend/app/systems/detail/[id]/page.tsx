'use client';

import { useParams } from 'next/navigation';
import { client } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SystemDetailPage() {
  const params = useParams();
  const systemId = params.id as string;

  // Use the ts-rest query hook
  const { data: response, isLoading, error } = client.getSystem.useQuery({
    queryKey: ['system', systemId],
    queryData: { params: { id: systemId } }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load system details</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const system = response?.body;

  if (!system) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>System not found</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{system.name}</CardTitle>
          <CardDescription>System Details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">ID</h3>
              <p className="text-sm text-muted-foreground">{system.id}</p>
            </div>
            <div>
              <h3 className="font-semibold">Version</h3>
              <p className="text-sm text-muted-foreground">{system.version}</p>
            </div>
            <div>
              <h3 className="font-semibold">Endpoint</h3>
              <p className="text-sm text-muted-foreground">{system.endpoint}</p>
            </div>
            <div>
              <h3 className="font-semibold">Description</h3>
              <p className="text-sm text-muted-foreground">{system.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
