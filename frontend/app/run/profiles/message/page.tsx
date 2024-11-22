'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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

const formSchema = z.object({
  systemName: z.string().min(2).max(50),
  systemEndpoint: z.string().min(2).max(255),
  systemVersion: z.string().min(2).max(255),
})

export function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      systemName: "",
      systemEndpoint: "",
      systemVersion: "",
    },
  })

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values)
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
                  <Input placeholder="shadcn" {...field} />
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
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  )

}

export default function ConfigurePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testStarted, setTestStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const startTest = async () => {
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/start-container', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_TOKEN',
        },
        body: JSON.stringify({
          profile: 'profile1',
          systemName: 'Test System',
          endpointUrl: 'http://localhost:3000',
          runId: 'test-run-123',
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const { containerId } = await response.json();

      const socketInstance = io('https://external-backend.example.com', {
        transports: ['websocket'],
        auth: { token: 'YOUR_API_TOKEN' },
      });

      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket');
        socketInstance.emit('subscribeToRun', 'test-run-123');
      });

      socketInstance.on('log', (log) => {
        setLogs((prevLogs) => [...prevLogs, log]);
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from WebSocket');
      });

      socketInstance.on('connect_error', (err) => {
        console.error('Connection error:', err);
      });

      setSocket(socketInstance);
      setTestStarted(true);
    } catch (error) {
      console.error('Error starting test:', error);
    } finally {
      setLoading(false);
    }
  };


  // Cleanup the socket connection when the component unmounts
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

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
        <ProfileForm />
        {!testStarted ? (
          <button
            onClick={startTest}
            className={`p-4 bg-blue-500 text-white rounded ${loading && 'opacity-50 cursor-not-allowed'}`}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start Test'}
          </button>
        ) : (
          <div className="w-full max-w-lg bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-bold mb-2">Test Logs</h2>
            <div className="h-64 overflow-y-auto bg-black text-white p-2 rounded">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
