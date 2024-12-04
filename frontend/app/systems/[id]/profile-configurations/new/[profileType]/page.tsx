'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from '@/hooks/use-toast';
import { SystemInfoPanel } from '@/components/system-info-panel';

import { client } from '@/lib/api';
import { CreateProfileConfigurationSchema, ProfileConfigurationType } from '@conformance-test-suite/shared/src/profileConfigurationContract';
import { useParams } from 'next/navigation';
import { SystemLoadingState } from '@/components/system-loading-state';
import { useSystem } from '@/hooks/use-system';

const formSchema = CreateProfileConfigurationSchema.omit({ systemId: true, type: true }).extend({
  authorizationEndpoint: z.string().url().min(5).max(255).optional(),
  clientId: z.string().min(5).max(255).optional(),
  jwks: z.string().min(5).optional(),
  type: z.nativeEnum(ProfileConfigurationType),
});

export default function ProfileConfigurationCreationForm() {
  const params = useParams();
  const profileType = (params.profileType as string) === 'api'
    ? ProfileConfigurationType.API
    : ProfileConfigurationType.MESSAGE;

  const systemId = params.id as string;
  const { system, isLoading, error, isNotFound } = useSystem(systemId);
  const router = useRouter();

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

  // Setup form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: profileType === ProfileConfigurationType.API
        ? "API Profile Configuration"
        : "Message Profile Configuration",
      description: profileType === ProfileConfigurationType.API
        ? "Default profile configuration for conformance testing with API-based flows"
        : "Default profile configuration for conformance testing with AATH and DIDComm v1",
      configuration: {},
      type: profileType,
      authorizationEndpoint: 'openid4vp://authorize',
      clientId: '',
      jwks: '',
    },
  });

  // Reset form with default values when component mounts
  React.useEffect(() => {
    form.reset({
      name: profileType === ProfileConfigurationType.API
        ? "API Profile Configuration"
        : "Message Profile Configuration",
      description: profileType === ProfileConfigurationType.API
        ? "Default profile configuration for conformance testing with API-based flows"
        : "Default profile configuration for conformance testing with AATH and DIDComm v1",
      configuration: {},
      type: profileType,
      authorizationEndpoint: 'openid4vp://authorize',
      clientId: '',
      jwks: '',
    });
  }, [profileType]); // Add profileType to dependencies

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

  // Form submission handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const configuration = profileType === ProfileConfigurationType.API
      ? {
          authorizationEndpoint: values.authorizationEndpoint,
          clientId: values.clientId,
          jwks: values.jwks,
        }
      : {};

    mutation.mutate({
      params: { systemId },
      body: {
        name: values.name,
        description: values.description,
        type: profileType,
        configuration
      }
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

              {profileType === ProfileConfigurationType.API && (
                <>
                  <FormField
                    control={form.control}
                    name="authorizationEndpoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authorization Endpoint</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The authorization endpoint for the message profile.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The client ID for the message profile.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jwks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>JWKS</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormDescription>
                          The JWKS for the message profile.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

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