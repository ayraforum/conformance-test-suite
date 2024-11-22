'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

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
import { getBackendAddress } from "@/lib/backend";
import { LazyLog } from "@melloware/react-logviewer";

const formSchema = z.object({
  systemName: z.string().min(2).max(50),
  systemEndpoint: z.string().min(2).max(255),
  systemVersion: z.string().min(2).max(255),
})

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

export default function ConfigurePage() {
  const [logs, setLogs] = useState<{type: string, message: string}[]>([]);
  const [logStream, setLogStream] = useState<string>("");
  const [testStarted, setTestStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [runId] = useState(() => uuidv4());

  const startTest = async (formValues: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      const response = await fetch(`${getBackendAddress()}/execute-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_TOKEN',
        },
        body: JSON.stringify({
          systemName: formValues.systemName,
          systemVersion: formValues.systemVersion,
          systemEndpoint: formValues.systemEndpoint,
          runId: runId
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      const socketInstance = io(getBackendAddress(), {
        transports: ['websocket']
      });

      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket');
        socketInstance.emit('join-room', `logs-${runId}`);
      });

      socketInstance.on('log', (log) => {
        setLogs((prevLogs) => [...prevLogs, log]);
        setLogStream((prevLogStream) => {
          const logMessage = typeof log.message === 'string' ? log.message : JSON.stringify(log.message);
          const formattedMessage = logMessage.endsWith('\n') ? logMessage : `${logMessage}\n`;
          return prevLogStream + formattedMessage;
        });
      });

      socketInstance.on("log-complete", () => {
        console.log("Log streaming complete.");
        socketInstance.emit('leave-room', `logs-${runId}`);
        socketInstance.disconnect();
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
        <ProfileForm onStartTest={startTest} />
        {testStarted && (
          <div className="w-full max-w-lg bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-bold mb-2">Test Logs</h2>
            {logStream && logStream.length > 0 ? (
              <div style={{ height: '400px' }}>
                <LazyLog
                  text={logStream}
                  stream={true}
                  follow={true}
                  selectableLines={true}
                  enableSearch={true}
                  height={400}
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "#0f0",
                    backgroundColor: "#000",
                  }}
                />
              </div>
            ) : (
              <p>Waiting for logs...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
