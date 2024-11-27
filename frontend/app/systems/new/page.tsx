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

import { useMutation } from '@tanstack/react-query';
import { CreateSystemSchema } from '@conformance-test-suite/shared/src/systemContract';
import { client } from '@/lib/api';

const formSchema = CreateSystemSchema

export function SystemCreationForm() {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      endpoint: "",
      version: "",
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Form submitted with values:", values);

    // try {
      console.log("Attempting to create system...");
      const response = await client.createSystem.useMutation({
        body: {
          name: values.name,
          endpoint: values.endpoint,
          version: values.version,
          description: values.description,
        },
      });
      console.log("Response received:", response);

      if (response.status === 201) {
        toast({
          title: "Success",
          description: "System created successfully",
        });
        router.push(`/systems/${response.body.id}`);
      }
    // } catch (error) {
    //   console.error("Detailed error:", error);
    //   toast({
    //     title: "Error",
    //     description: "Failed to create system",
    //     variant: "destructive",
    //   });
    // }
  }

  console.log("Form state:", form.formState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Configuration</CardTitle>
        <CardDescription>Configure the system you wish to test.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-2xl min-w-[320px]">
            <FormField
              control={form.control}
              name="name"
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
              name="endpoint"
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
              name="version"
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Example System Description" {...field} />
                  </FormControl>
                  <FormDescription>
                    Please enter a name for the system.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" onClick={() => console.log("Button clicked")}>
              Submit
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter />
    </Card>
  );
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
      <h1 className="text-2xl font-bold mb-4">System Creation</h1>
      <p className="text-gray-500 mb-8 text-center">
        Use the form on this page to create a new system.
        <br />
        Once created, you can test the system against the various profiles.
        <br />
        The page will automatically navigate to the system details page after creation.
      </p>
      <Separator className="mb-8" />
      <div className="w-full max-w-2xl px-4">
        <SystemCreationForm />
      </div>
    </div>
  );
}
