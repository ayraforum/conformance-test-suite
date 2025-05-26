'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

import { client } from '@/lib/api';
import { CreateSystemSchema } from '@conformance-test-suite/shared/src/systemContract';

const formSchema = CreateSystemSchema;

export default function SystemCreationForm() {
  const router = useRouter();

  // Setup form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      version: "",
      description: "",
    },
  });

  // Use the ts-rest mutation hook
  const mutation = client.createSystem.useMutation({
    onSuccess: (response) => {
      if (response.status === 201) {
        toast({
          title: "Success",
          description: "System created successfully",
        });
        router.push(`/systems/${response.body.id}`);
      }
    },
    onError: (error: any) => {
      console.error("Error creating system:", error);
      toast({
        title: "Error",
        description: "Failed to create system",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate({
      body: values
    });
  };

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
                    Please enter a description for the system.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
