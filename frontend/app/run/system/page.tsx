"use client";

import { useQuery } from '@ts-rest/react-query/v5'
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SystemPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['systems'],
    queryFn: async () => {
      try {
        const response = await client.getSystems({
          query: {
            offset: "0",
            limit: "10",
          }
        });
        return response;
      } catch (err) {
        console.error('Error fetching systems:', err);
        throw err;
      }
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) {
    console.error('Error in component:', error);
    return (
      <div className="text-red-500">
        Error loading systems: {(error as Error).message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Systems</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Version</th>
                <th className="text-left p-2">Endpoint</th>
                <th className="text-left p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {data?.body.contents.map((system) => (
                <tr key={system.id} className="border-b">
                  <td className="p-2">{system.name}</td>
                  <td className="p-2">{system.version}</td>
                  <td className="p-2">{system.endpoint}</td>
                  <td className="p-2">{system.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

        </CardContent>
      </Card>
    </div>
  );
}
