import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getBackendAddress } from "@/lib/backend";

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

  useEffect(() => {
    if (!testRuns?.length) return;

    const socketInstance = io(getBackendAddress(), {
      transports: ['websocket']
    });

    socketInstance.on('connect', () => {
      testRuns.forEach(run => {
        if (run?.profileConfigurationId) {
          socketInstance.emit('join-room', `logs-${run.profileConfigurationId}`);
        }
      });
    });

    socketInstance.on('log', (log: LogEntry, correlationId: string) => {
      setLogs(prevLogs => ({
        ...prevLogs,
        [correlationId]: [...(prevLogs[correlationId] || []), log]
      }));

      setLogStreams(prevStreams => {
        const logMessage = typeof log.message === 'string' ? log.message : JSON.stringify(log.message);
        const formattedMessage = logMessage.endsWith('\n') ? logMessage : `${logMessage}\n`;
        return {
          ...prevStreams,
          [correlationId]: (prevStreams[correlationId] || '') + formattedMessage
        };
      });
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
        testRuns.forEach(run => {
          if (run?.profileConfigurationId) {
            socketInstance.emit('leave-room', `logs-${run.profileConfigurationId}`);
          }
        });
        socketInstance.disconnect();
      }
    };
  }, [JSON.stringify(testRuns)]);

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