'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemInfoPanel } from '@/components/system-info-panel';
import { useParams } from 'next/navigation';
import { SystemLoadingState } from '@/components/system-loading-state';
import { useSystem } from '@/hooks/use-system';

export default function SelectProfilePage() {

  const params = useParams();
  const router = useRouter();
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

  // Handles selection and moves to the next step
  const handleSelect = (profile: string) => {
    if(profile === 'api') {
      router.push(`/systems/${systemId}/profile-configurations/new/api/`);
    } else if (profile === 'message') {
      router.push(`/systems/${systemId}/profile-configurations/new/message/`);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <SystemInfoPanel system={system} />
      <div className="py-8 min-h-screen flex flex-col items-center bg-background p-8">
      <h1 className="text-2xl font-bold text-primary mb-8">Select a Profile to Test</h1>
      <div className="flex space-x-4">
        {/* Profile Option 1 */}
      <Card className="w-64 cursor-pointer hover:shadow-lg" onClick={() => handleSelect('api')}>
        <CardHeader>
          <CardTitle>API Profile</CardTitle>
          <CardDescription>OpenID4VCI/VP</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This profile checks conformance to the OpenID4VCI/VP standards.</p>
        </CardContent>
        <CardFooter>
          <Button variant="default" onClick={() => handleSelect('api')}>
            Select OpenID4VCI/VP Profile
          </Button>
        </CardFooter>
      </Card>

      {/* Profile Option 2 */}
      <Card className="w-64 cursor-pointer hover:shadow-lg" onClick={() => handleSelect('message')}>
        <CardHeader>
          <CardTitle>Message Profile</CardTitle>
          <CardDescription>DIDComm v1</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This profile checks conformance to the DIDComm v1 standards.</p>
        </CardContent>
        <CardFooter>
          <Button variant="default" onClick={() => handleSelect('message')}>
            Select DIDComm v1 Profile
          </Button>
        </CardFooter>
      </Card>
      </div>
      </div>
    </div>
  );
}
