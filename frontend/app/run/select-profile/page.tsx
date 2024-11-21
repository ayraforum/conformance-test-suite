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
        <Card className="w-64 cursor-pointer hover:shadow-lg" onClick={() => handleSelect('profile1')}>
          <CardHeader>
            <CardTitle>Profile 1</CardTitle>
            <CardDescription>A brief description of Profile 1.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This profile is optimized for X use cases and supports Y standards.</p>
          </CardContent>
          <CardFooter>
            <Button variant="primary" onClick={() => handleSelect('profile1')}>
              Select Profile 1
            </Button>
          </CardFooter>
        </Card>

        {/* Profile Option 2 */}
        <Card className="w-64 cursor-pointer hover:shadow-lg" onClick={() => handleSelect('profile2')}>
          <CardHeader>
            <CardTitle>Profile 2</CardTitle>
            <CardDescription>A brief description of Profile 2.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This profile is tailored for Z use cases and supports advanced scenarios.</p>
          </CardContent>
          <CardFooter>
            <Button variant="primary" onClick={() => handleSelect('profile2')}>
              Select Profile 2
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
