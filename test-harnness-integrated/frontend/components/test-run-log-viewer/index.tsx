'use client'

import { LazyLog } from "@melloware/react-logviewer";
import { useState } from "react";

interface TestRunLogViewerProps {
  profileConfigurationId: string;
  testRunId: number;
  logStream: string;
  isComplete: boolean;
}

export function TestRunLogViewer({ profileConfigurationId, testRunId, logStream, isComplete }: TestRunLogViewerProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="border-t border-border mt-4 first:mt-0 first:border-t-0">
      <div 
        className="flex justify-between items-center py-3 px-4 cursor-pointer hover:bg-accent/50" 
        onClick={() => setIsVisible(!isVisible)}
      >
        <h3 className="font-semibold">Test Run {testRunId} Logs</h3>
        <span>{isVisible ? '▼' : '▶'}</span>
      </div>
      {isVisible && (
        <div className="px-4 pb-4">
          {logStream && logStream.length > 0 ? (
            <div style={{ height: '400px' }}>
              <LazyLog
                text={logStream}
                stream={true}
                follow={!isComplete}
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
            <p className="text-center py-4">Waiting for logs...</p>
          )}
        </div>
      )}
    </div>
  );
} 