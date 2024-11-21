'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ConfigurePage() {
  const searchParams = useSearchParams();
  const profile = searchParams.get('profile');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <h1 className="text-2xl font-bold text-primary mb-8">
        Configure the System for {profile?.toUpperCase()}
      </h1>
      <div className="w-96 bg-card p-4 rounded shadow">
        <label className="block text-sm font-medium text-primary mb-2">
          System Name
        </label>
        <Input type="text" placeholder="Enter system name" className="mb-4" />

        <label className="block text-sm font-medium text-primary mb-2">
          Endpoint URL
        </label>
        <Input type="url" placeholder="Enter system endpoint URL" className="mb-4" />

        <Button variant="primary" className="w-full">
          Start Test
        </Button>
      </div>
    </div>
  );
}
