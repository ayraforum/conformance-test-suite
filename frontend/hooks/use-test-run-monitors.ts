import { useState, useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { getBackendAddress } from "@/lib/backend";
import { useQueryClient } from '@tanstack/react-query';

interface TestRunMonitor {
  systemId: string;
  profileConfigurationId: string;
  testRunId: number;
}

interface LogEntry {
  type: string;
  message: string;
}

export function useTestRunMonitors(testRuns: TestRunMonitor[]) {
  const [completedRuns, setCompletedRuns] = useState<Set<string>>(new Set());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logStreams, setLogStreams] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});
  const queryClient = useQueryClient();

  // Memoize the room IDs
  const rooms = useMemo(() =>
    testRuns
      ?.map(run => run?.profileConfigurationId ? `updates-${run.profileConfigurationId}-${run.testRunId}` : null)
      .filter(Boolean) ?? [],
    [testRuns?.map(run => `${run?.profileConfigurationId}-${run?.testRunId}`).join(',')]
  );

  useEffect(() => {
    if (!rooms.length) return;

    const socketInstance = io(getBackendAddress(), {
      transports: ['websocket']
    });

    socketInstance.on('connect', () => {
      rooms.forEach(room => {
        socketInstance.emit('join-room', room);
      });
    });

    socketInstance.on('update', (update: { type: string; payload?: any }, correlationId: string) => {
      switch (update.type) {
        case 'log':
          setLogs(prevLogs => ({
            ...prevLogs,
            [correlationId]: [...(prevLogs[correlationId] || []), update.payload]
          }));

          setLogStreams(prevStreams => {
            const logMessage = typeof update.payload.message === 'string'
              ? update.payload.message
              : JSON.stringify(update.payload.message);
            const formattedMessage = logMessage === '.' ? logMessage :
              (logMessage.endsWith('\n') ? logMessage : `${logMessage}\n`);
            return {
              ...prevStreams,
              [correlationId]: (prevStreams[correlationId] || '') + formattedMessage
            };
          });
          break;

        case 'status':
          queryClient.invalidateQueries(['test-run', correlationId]);
          break;
      }
    });

    socketInstance.on("log-complete", (runId: string) => {
      setCompletedRuns(prev => new Set([...prev, runId]));
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Connection error:', err);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance?.connected) {
        rooms.forEach(room => {
          socketInstance.emit('leave-room', room);
        });
        socketInstance.disconnect();
      }
    };
  }, [rooms]);

  return {
    completedRuns,
    isComplete: (runId: string) => completedRuns.has(runId),
    getMonitor: (runId: number) => {
      const monitor = testRuns.find(run => run.testRunId === runId);
      if (!monitor) return null;

      const correlationId = `${monitor.profileConfigurationId}-${runId.toString()}`
      return {
        logStream: logStreams[correlationId] || '',
        logs: logs[correlationId] || [],
        isComplete: completedRuns.has(correlationId)
      };
    }
  };
}