import React, { useEffect, useState } from "react";
import { VerifierContext } from "@/services/tests/VerifierContext";
import { TestStepController, TestStepStatus } from "@/services/BaseTestContext";
import RenderQRCode from "@/components/RenderQRCode";

interface VerifierConnectionStepProps {
  context: VerifierContext;
  controller: TestStepController;
  isActive: boolean;
  invitationUrl: string | null;
  messages: string[];
  hasStarted: boolean;
  onStart: () => Promise<void>;
}

export function VerifierConnectionStep({
  context,
  controller,
  isActive,
  invitationUrl,
  messages,
  hasStarted,
  onStart
}: VerifierConnectionStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update status when step becomes active
  useEffect(() => {
    if (isActive) {
      controller.setStatus("running" as TestStepStatus);
    }
  }, [isActive, controller]);

  // Handle start button click
  const handleStart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onStart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start connection setup');
      controller.setError(err instanceof Error ? err.message : 'Failed to start connection setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Setup Connection</h4>
        <p className="text-blue-800 text-sm">
          This step will establish a connection with your holder wallet and prepare for credential presentation.
        </p>
      </div>
      
      {!hasStarted ? (
        <button
          onClick={handleStart}
          disabled={isLoading}
          className="btn btn-blue"
        >
          {isLoading ? 'Starting...' : 'Start Connection Setup'}
        </button>
      ) : (
        <div className="space-y-4">
          {invitationUrl ? (
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="font-semibold text-gray-900 mb-2">Scan QR Code</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Scan this QR code with your holder wallet to establish a connection
                </p>
                <div className="flex justify-center">
                  <RenderQRCode value={invitationUrl} size={300} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center">
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12z"></path>
                </svg>
                <span className="ml-2 text-gray-600">Starting connection setup...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-4 space-y-2">
          {messages.map((message, index) => (
            <div key={index} className="text-sm text-gray-600">
              {message}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

