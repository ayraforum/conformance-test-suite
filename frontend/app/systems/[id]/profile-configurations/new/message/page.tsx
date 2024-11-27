'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from '@/hooks/use-toast';
import { SystemInfoPanel } from '@/components/system-info-panel';

import { client } from '@/lib/api';
import { CreateProfileConfigurationSchema } from '@conformance-test-suite/shared/src/profileConfigurationContract';
import { useParams } from 'next/navigation';
import { SystemLoadingState } from '@/components/system-loading-state';
import { useSystem } from '@/hooks/use-system';

const formSchema = CreateProfileConfigurationSchema.omit({ systemId: true });

export default function ProfileConfigurationCreationForm() {
const params = useParams();
const systemId = params.id as string;
const { system, isLoading, error, isNotFound } = useSystem(systemId);
  const router = useRouter();

  // Setup form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Message Profile Configuration",
      description: "Default profile configuration for conformance testing with AATH and DIDComm v1",
      configuration: {},
    },
  });

  // Reset form with default values when component mounts
  React.useEffect(() => {
    form.reset({
        name: "Message Profile Configuration",
        description: "Default profile configuration for conformance testing with AATH and DIDComm v1",
      configuration: {},
    });
  }, []); // Empty dependency array means this runs once when component mounts


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

  // Use the ts-rest mutation hook
  const mutation = client.createProfileConfiguration.useMutation({
    onSuccess: (response) => {
      if (response.status === 201) {
        toast({
          title: "Success",
          description: "Profile configuration created successfully",
        });
        router.push(`/systems/${systemId}/profile-configurations/${response.body.id}`);
      }
    },
    onError: (error: any) => {
      console.error("Error creating profile configuration:", error);
      toast({
        title: "Error",
        description: "Failed to create profile configuration",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate({
      params: { systemId },
      body: values
    });
  };

  return (
    <div className="container mx-auto py-10">
      <SystemInfoPanel system={system} />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Create Profile Configuration</CardTitle>
          <CardDescription>Configure the profile settings for your system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-2xl min-w-[320px]">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormDescription>
                      Pre-set name for this profile configuration.
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormDescription>
                      Pre-set description for this profile configuration.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Profile Configuration"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}