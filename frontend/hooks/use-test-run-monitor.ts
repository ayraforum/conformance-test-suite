import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getBackendAddress } from "@/lib/backend";
import { toast } from "@/hooks/use-toast";

interface TestRunMonitorProps {
  systemId: string;
  profileConfigurationId: string;
  testRunId: number;
}

export function useTestRunMonitor({ systemId, profileConfigurationId, testRunId }: TestRunMonitorProps) {
  const [logs, setLogs] = useState<{type: string, message: string}[]>([]);
  const [logStream, setLogStream] = useState<string>("");
  const [isComplete, setIsComplete] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io(getBackendAddress(), {
      transports: ['websocket']
    });

    const room = `logs-${profileConfigurationId}-${testRunId}`;

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket');
      socketInstance.emit('join-room', room);
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
      socketInstance.emit('leave-room', room);
      socketInstance.disconnect();
      toast({
        title: "Test Run Completed",
        description: "Test run results are now available.",
      });
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [profileConfigurationId, testRunId]);

  return {
    logs,
    logStream,
    isComplete,
    socket
  };
}