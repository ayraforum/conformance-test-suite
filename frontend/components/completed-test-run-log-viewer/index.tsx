'use client'

import { LazyLog } from "@melloware/react-logviewer";
import { useState } from "react";
import { useTestRunLogs } from "@/hooks/use-test-run-logs";

interface CompletedTestRunLogViewerProps {
  systemId: string;
  profileConfigurationId: string;
  testRunId: number;
}

export function CompletedTestRunLogViewer({ systemId, profileConfigurationId, testRunId }: CompletedTestRunLogViewerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);

  const { logs, isLoading } = useTestRunLogs(systemId, profileConfigurationId, testRunId, shouldFetch);

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
    if (!shouldFetch) {
      setShouldFetch(true);
    }
  };

  const logText = logs?.map(log => log.message).join('\n') || '';

  return (
    <div className="border-t border-border mt-4 first:mt-0 first:border-t-0">
      <div
        className="flex justify-between items-center py-3 px-4 cursor-pointer hover:bg-accent/50"
        onClick={handleToggleVisibility}
      >
        <h3 className="font-semibold">Test Run {testRunId} Logs</h3>
        <span>{isVisible ? '▼' : '▶'}</span>
      </div>
      {isVisible && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <p className="text-center py-4">Loading logs...</p>
          ) : logText ? (
            <div style={{ height: '400px' }}>
              <LazyLog
                text={logText}
                stream={false}
                follow={false}
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
            <p className="text-center py-4">No logs available</p>
          )}
        </div>
      )}
    </div>
  );
}