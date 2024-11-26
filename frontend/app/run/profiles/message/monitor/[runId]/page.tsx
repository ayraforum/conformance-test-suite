'use client'

import { useState, useEffect, use } from 'react';
import { io, Socket } from 'socket.io-client';
import { LazyLog } from "@melloware/react-logviewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBackendAddress } from "@/lib/backend";
import { toast } from "@/hooks/use-toast"
import { initClient } from "@ts-rest/core";
import { testContract } from "@conformance-test-suite/shared/src/testContract";

export const apiClient = initClient(testContract, {
  baseUrl: getBackendAddress(),
});

// Add these interfaces
interface TestResult {
  profile: string;
  feature_name: string;
  scenario_name: string;
  status: string;
  tags: string[];
}

interface ConformanceResult {
  profileResults: {
    profileName: string;
    passedTests: TestResult[];
    failedTests: TestResult[];
  }[];
  conformantProfiles: string[];
  isConformant: boolean;
}

export default function LogsPage({ params }: { params: { runId: string } }) {
  const [logs, setLogs] = useState<{type: string, message: string}[]>([]);
  const [logStream, setLogStream] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [conformanceResults, setConformanceResults] = useState<ConformanceResult | null>(null);
  const [conformanceError, setConformanceError] = useState<string | null>(null);
  const [conformanceVisible, setConformanceVisible] = useState(false);
  const [logsVisible, setLogsVisible] = useState(true);

  const resolvedParams = use(params);
  const runId = resolvedParams.runId;

  // Add function to fetch conformance results
  const fetchConformanceResults = async () => {
    try {
      const response = await apiClient.checkConformance({
        params: {
          runId: runId
        }
      });

      if (response.status === 200) {
        setConformanceResults(response.body);
      } else if (response.status === 404) {
        throw new Error(`Error fetching conformance results: ${response.body.error}`);
      }

    } catch (error) {
      setConformanceError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

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
      fetchConformanceResults();
      setConformanceVisible(true);
      setLogsVisible(false);
      toast({
        title: "Test Run Completed",
        description: "Conformance results are now available.",
      })
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

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">Test Execution Results</h1>
      <div className="w-full max-w-4xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>System Under Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong>Run ID:</strong> {runId}</div>
              <div><strong>Status:</strong> {isComplete ? "Complete" : "Running"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setConformanceVisible(!conformanceVisible)}>
            <div className="flex justify-between items-center">
              <CardTitle>Conformance Results</CardTitle>
              <span>{conformanceVisible ? '▼' : '▶'}</span>
            </div>
          </CardHeader>
          {conformanceVisible && (
            <CardContent>
              {conformanceError ? (
                <div className="text-red-500">Error: {conformanceError}</div>
              ) : conformanceResults ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">Overall Status:</span>
                    <span className={conformanceResults.isConformant ? "text-green-500" : "text-red-500"}>
                      {conformanceResults.isConformant ? "Conformant" : "Non-Conformant"}
                    </span>
                  </div>

                  {conformanceResults.profileResults.map((profile, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h3 className="font-bold mb-2">{profile.profileName}</h3>

                      <div className="mb-4">
                        <h4 className="font-semibold text-green-500">
                          Passed Tests ({profile.passedTests.length})
                        </h4>
                        <ul className="list-disc pl-5">
                          {profile.passedTests.map((test, i) => (
                            <li key={i}>
                              [{test.feature_name}] {test.scenario_name}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {profile.failedTests.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-red-500">
                            Failed Tests ({profile.failedTests.length})
                          </h4>
                          <ul className="list-disc pl-5">
                            {profile.failedTests.map((test, i) => (
                              <li key={i}>
                                [{test.feature_name}] {test.scenario_name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4">Loading conformance results...</p>
              )}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setLogsVisible(!logsVisible)}>
            <div className="flex justify-between items-center">
              <CardTitle>Execution Logs</CardTitle>
              <span>{logsVisible ? '▼' : '▶'}</span>
            </div>
          </CardHeader>
          {logsVisible && (
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
          )}
        </Card>
      </div>
    </div>
  );
}