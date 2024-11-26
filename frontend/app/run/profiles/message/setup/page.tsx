'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { initClient } from "@ts-rest/core";
import { testContract } from "@conformance-test-suite/shared/src/testContract";

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getBackendAddress } from "@/lib/backend";
import { toast } from '@/hooks/use-toast';

import { client } from '@/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';

const formSchema = z.object({
  systemName: z.string().min(2).max(50),
  systemEndpoint: z.string().min(2).max(255),
  systemVersion: z.string().min(2).max(255),
})

// Example mutation
export function useExecuteProfile() {
  return useMutation({
    ...client.executeProfile.useMutation()
  });
}

export function ProfileForm({ onStartTest }: { onStartTest: (values: z.infer<typeof formSchema>) => Promise<void> }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      systemName: "",
      systemEndpoint: "",
      systemVersion: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await onStartTest(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Configuration</CardTitle>
        <CardDescription>Configure your system to be tested.</CardDescription>
      </CardHeader>
      <CardContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-2xl min-w-[320px]">
          <FormField
            control={form.control}
            name="systemName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Name</FormLabel>
                <FormControl>
                  <Input placeholder="Example System" {...field} />
                </FormControl>
                <FormDescription>
                  Please enter a name for the system.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="systemEndpoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Endpoint</FormLabel>
                <FormControl>
                  <Input placeholder="https://example-system-endpoint.local" {...field} />
                </FormControl>
                <FormDescription>
                  Please enter the endpoint for the system.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="systemVersion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Version</FormLabel>
                <FormControl>
                  <Input placeholder="0.1.0" {...field} />
                </FormControl>
                <FormDescription>
                  Please enter the version of the system.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit</Button>
        </form>
      </Form>
      </CardContent>
      <CardFooter>
        <p>Upon pressing enter, the system will be started and the test will begin.</p>
      </CardFooter>
    </Card>
  )

}

export const apiClient = initClient(testContract, {
  baseUrl: getBackendAddress(),
});

export default function ConfigurePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [runId] = useState(() => uuidv4());

  const startTest = async (formValues: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      const response = await apiClient.executeProfile({
        body: {
          systemName: formValues.systemName,
          systemVersion: formValues.systemVersion,
          systemEndpoint: formValues.systemEndpoint,
          runId: runId
        },
      });

      if (response.status === 200) {
        // Navigate to the logs page with the runId
        router.push(`/run/profiles/message/monitor/${runId}`);
      } else if (response.status === 404) {
        toast({
          title: 'Error starting test',
          description: response.body.error,
          variant: 'destructive',
        });
        throw new Error(`Error starting test: ${response.body.error}`);
      }
    } catch (error) {
      console.error('Error starting test:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">Message Profile Testing</h1>
      <p className="text-gray-500 mb-8 text-center">
        Use this page to test your system against the DIDComm v1 message profile.
        <br />
        Use the form below to configure your system and start the test.
      </p>
      <Separator className="mb-8" />
      <div className="w-full max-w-2xl px-4">
        <ProfileForm onStartTest={startTest} />
      </div>
    </div>
  );
}
