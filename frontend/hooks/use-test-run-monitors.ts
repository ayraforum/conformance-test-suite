import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getBackendAddress } from "@/lib/backend";

interface TestRunMonitor {
  systemId: string;
  profileConfigurationId: string;
  testRunId: number;
}

export function useTestRunMonitors(testRuns: TestRunMonitor[]) {
  const [completedRuns, setCompletedRuns] = useState<Set<string>>(new Set());
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io(getBackendAddress(), {
      transports: ['websocket']
    });

    socketInstance.on('connect', () => {
      testRuns.forEach(run => {
        socketInstance.emit('join-room', `logs-${run.testRunId}`);
      });
    });

    socketInstance.on("log-complete", (runId: string) => {
      setCompletedRuns(prev => new Set([...prev, runId]));
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        testRuns.forEach(run => {
          socketInstance.emit('leave-room', `logs-${run.testRunId}`);
        });
        socketInstance.disconnect();
      }
    };
  }, [testRuns.map(run => run.testRunId).join(',')]);

  return {
    completedRuns,
    isComplete: (runId: string) => completedRuns.has(runId)
  };
}