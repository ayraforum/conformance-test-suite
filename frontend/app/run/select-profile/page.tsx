'use client';

import { useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
  import { Button } from "@/components/ui/button";

export default function SelectProfilePage() {
  const router = useRouter();

  // Handles selection and moves to the next step
  const handleSelect = (profile: string) => {
    router.push(`/run/configure-profile?profile=${profile}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
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
  );
}
