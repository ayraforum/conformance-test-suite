'use client'

import { useState, useEffect, use } from 'react';
import { io, Socket } from 'socket.io-client';
import { LazyLog } from "@melloware/react-logviewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBackendAddress } from "@/lib/backend";
import { useRouter } from "next/navigation";

export default function LogsPage({ params }: { params: { runId: string } }) {
  const [logs, setLogs] = useState<{type: string, message: string}[]>([]);
  const [logStream, setLogStream] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const resolvedParams = use(params);
  const runId = resolvedParams.runId;

  useEffect(() => {
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
      setIsComplete(true);
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

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [runId]);

  // ... previous code stays the same ...

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">Test Execution Logs</h1>
      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>
              Test Run: {runId}
              {isComplete && <span className="ml-2 text-green-500">(Complete)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logStream && logStream.length > 0 ? (
              <div style={{ height: '600px' }}>
                <LazyLog
                  text={logStream}
                  stream={true}
                  follow={!isComplete}
                  selectableLines={true}
                  enableSearch={true}
                  height={600}
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "#0f0",
                    backgroundColor: "#000",
                  }}
                />
              </div>
            ) : (
              <p className="text-center py-4">Waiting for logs...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}