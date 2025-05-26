import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SystemLoadingStateProps {
  isLoading: boolean;
  error?: Error | null;
  isNotFound?: boolean;
}

export function SystemLoadingState({ isLoading, error, isNotFound }: SystemLoadingStateProps) {
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

  if (isNotFound) {
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

  return null;
}