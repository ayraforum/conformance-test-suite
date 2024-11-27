'use client'

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { LazyLog } from "@melloware/react-logviewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBackendAddress } from "@/lib/backend";
import { toast } from "@/hooks/use-toast"
import { SystemInfoPanel } from '@/components/system-info-panel';
import { useParams } from 'next/navigation';
import { SystemLoadingState } from '@/components/system-loading-state';
import { useSystem } from '@/hooks/use-system';
import { client } from '@/lib/api';
import { useProfileConfiguration } from '@/hooks/use-profile-configuration';
import { ProfileConfigurationInfoPanel } from '@/components/profile-configuration-info-panel';
import { StartTestRunButton } from '@/components/start-test-run-button';
import { useTestRuns } from '@/hooks/use-test-runs';
export default function ProfileOverviewPage() {
    const params = useParams();
    const systemId = params.id as string;
    const profileConfigurationId = params['profile-configuration-id'] as string;

    const [logs, setLogs] = useState<{type: string, message: string}[]>([]);
    const [logStream, setLogStream] = useState<string>("");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [conformanceVisible, setConformanceVisible] = useState(false);
    const [logsVisible, setLogsVisible] = useState(true);

    const { system, isLoading, error, isNotFound } = useSystem(systemId);
    const { profileConfiguration, isLoading: profileConfigurationLoading, error: profileConfigurationError, isNotFound: profileConfigurationNotFound } = useProfileConfiguration(systemId, profileConfigurationId);
    const { testRuns, isLoading: testRunsLoading, error: testRunsError, isNotFound: testRunsNotFound } = useTestRuns(systemId, profileConfigurationId);

        // Socket.io setup for real-time logs
      //   useEffect(() => {
      //     const socketInstance = io(getBackendAddress(), {
      //         transports: ['websocket']
      //     });

      //     socketInstance.on('connect', () => {
      //         console.log('Connected to WebSocket');
      //         socketInstance.emit('join-room', `logs-${profileConfigurationId}`);
      //     });

      //     socketInstance.on('log', (log) => {
      //         setLogs((prevLogs) => [...prevLogs, log]);
      //         setLogStream((prevLogStream) => {
      //             const logMessage = typeof log.message === 'string' ? log.message : JSON.stringify(log.message);
      //             const formattedMessage = logMessage.endsWith('\n') ? logMessage : `${logMessage}\n`;
      //             return prevLogStream + formattedMessage;
      //         });
      //     });

      //     socketInstance.on("log-complete", () => {
      //         console.log("Log streaming complete.");
      //         setIsComplete(true);
      //         socketInstance.emit('leave-room', `logs-${profileConfigurationId}`);
      //         socketInstance.disconnect();
      //         setConformanceVisible(true);
      //         setLogsVisible(false);
      //         toast({
      //             title: "Test Run Completed",
      //             description: "Conformance results are now available.",
      //         });
      //     });

      //     setSocket(socketInstance);

      //     return () => {
      //         if (socketInstance) {
      //             socketInstance.disconnect();
      //         }
      //     };
      // }, [profileConfigurationId]);

    // Use ts-rest query for conformance results
    // const { data: conformanceResults, error: conformanceError } = client.checkTestRunResults.useQuery({
    //     queryKey: ['conformance-results', profileConfigurationId, { enabled: isComplete }],
    //     queryData: {
    //       params: {
    //         systemId,
    //         profileConfigurationId,
    //         id: profileConfigurationId
    //       }
    //     }
    // });

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

    const handleStartNewTestRun = () => {
        startTestRun({
            body: {
                profileConfigurationId,
                systemId,
            }
        });
    };

    // Rest of your render code remains largely the same, but using the new data sources
    return (
      <div className="container mx-auto py-10 space-y-6">
            <SystemInfoPanel system={system} />
            <ProfileConfigurationInfoPanel profileConfiguration={profileConfiguration} />
            <h1 className="text-2xl font-bold mb-4">Test Runs</h1>
            {/* Buttons to start a new test run */}
            <div className="mb-4">
                <StartTestRunButton
                    systemId={systemId}
                    profileConfigurationId={profileConfigurationId}
              />
            </div>

            <div className="w-full max-w-6xl space-y-4">
                {testRuns?.contents.length > 0 ? (
                    testRuns.contents.map((run) => (
                        <Card key={run.id} className="w-full">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Test Run {run.id}</CardTitle>
                                    <span className={`px-3 py-1 rounded-full ${
                                        run.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                        run.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {run.status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <div>
                                            <div className="text-sm text-gray-500">Started at</div>
                                            <div>{new Date(run.startedAt).toLocaleString()}</div>
                                        </div>
                                        {run.completedAt && (
                                            <div>
                                                <div className="text-sm text-gray-500">Completed at</div>
                                                <div>{new Date(run.completedAt).toLocaleString()}</div>
                                            </div>
                                        )}
                                    </div>

                                    {run.results && (
                                        <div>
                                            <div className="text-sm font-medium mb-2">Results Summary</div>
                                            <div className="flex space-x-4">
                                                <div className="text-green-600">
                                                    <span className="font-bold">{run.results.passedTests?.length || 0}</span> Passed
                                                </div>
                                                <div className="text-red-600">
                                                    <span className="font-bold">{run.results.failedTests?.length || 0}</span> Failed
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card className="w-full">
                        <CardHeader>
                            <CardTitle>No Test Runs Available</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500">There are currently no test runs. Click the button above to start a new test run.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
