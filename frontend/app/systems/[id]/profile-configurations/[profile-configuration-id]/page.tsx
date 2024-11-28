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
import { useTestRunMonitors } from '@/hooks/use-test-run-monitors';
export default function ProfileOverviewPage() {
    const params = useParams();
    const systemId = params.id as string;
    const profileConfigurationId = params['profile-configuration-id'] as string;

    const { system, isLoading, error, isNotFound } = useSystem(systemId);
    const {
        profileConfiguration,
        isLoading: profileConfigurationLoading,
        error: profileConfigurationError,
        isNotFound: profileConfigurationNotFound
    } = useProfileConfiguration(systemId, profileConfigurationId);
    const {
        testRuns,
        isLoading: testRunsLoading,
        error: testRunsError,
        isNotFound: testRunsNotFound
    } = useTestRuns(systemId, profileConfigurationId);

    const runningTestRuns = testRuns?.contents.filter(run => run.state === 'running') || [];

    const testRunMonitors = useTestRunMonitors(
        runningTestRuns.map(run => ({
            systemId,
            profileConfigurationId,
            testRunId: run.id
        }))
    );

    useEffect(() => {
        const hasCompletedRuns = runningTestRuns.some(run =>
            testRunMonitors.isComplete(run.id)
        );

        if (hasCompletedRuns) {
            client.useQueryClient().invalidateQueries({
                queryKey: ['test-runs', systemId, profileConfigurationId]
            });
        }
    }, [runningTestRuns, testRunMonitors.completedRuns]);

    // Combined loading state for all data dependencies
    const loadingState = (
        <SystemLoadingState
            isLoading={isLoading || profileConfigurationLoading || testRunsLoading}
            error={error || profileConfigurationError || testRunsError}
            isNotFound={isNotFound || profileConfigurationNotFound || testRunsNotFound}
        />
    );

    // Check all loading conditions before rendering main content
    if (isLoading || profileConfigurationLoading || testRunsLoading ||
        error || profileConfigurationError || testRunsError ||
        isNotFound || profileConfigurationNotFound || testRunsNotFound) {
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
                                        run.state === 'completed' ? 'bg-green-100 text-green-800' :
                                        run.state === 'running' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {run.state}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <div>
                                            <div className="text-sm text-gray-500">Started at</div>
                                            <div>{new Date(run.createdAt).toLocaleString()}</div>
                                        </div>
                                        {run.updatedAt && (
                                            <div>
                                                <div className="text-sm text-gray-500">Updated at</div>
                                                <div>{new Date(run.updatedAt).toLocaleString()}</div>
                                            </div>
                                        )}
                                    </div>

                                    {run.error && (
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                                            <div className="text-sm font-medium text-red-800 mb-1">Error Detected</div>
                                            <div className="text-red-600">{run.error}</div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="text-sm font-medium mb-2">Results Summary</div>
                                        {run.results ? (
                                            <div className="flex space-x-4">
                                                <div className="text-green-600">
                                                    <span className="font-bold">{run.results.passedTests?.length || 0}</span> Passed
                                                </div>
                                                <div className="text-red-600">
                                                    <span className="font-bold">{run.results.failedTests?.length || 0}</span> Failed
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-gray-500">
                                                Results will appear here once the test run completes...
                                            </div>
                                        )}
                                    </div>
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
