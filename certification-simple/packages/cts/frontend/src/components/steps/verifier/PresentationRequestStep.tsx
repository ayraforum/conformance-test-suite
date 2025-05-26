import React, { useEffect } from "react";
import { VerifierContext } from "@/services/tests/VerifierContext";
import { TestStepController } from "@/services/BaseTestContext";

interface PresentationRequestStepProps {
  context: VerifierContext;
  controller: TestStepController;
  isActive: boolean;
}

export function PresentationRequestStep({ context, controller, isActive }: PresentationRequestStepProps) {
  // Mark step as waiting when active
  useEffect(() => {
    if (isActive) {
      controller.setStatus("running");
    }
  }, [isActive, controller]);

  const handleRequestProof = async () => {
    try {
      const response = await fetch('/api/run', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to request proof');
      }

      controller.setStatus("passed");
      controller.complete(true);
      controller.goToNextStep();
    } catch (error) {
      console.error('Error requesting proof:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      controller.setError(`Failed to request proof: ${errorMessage}`);
      controller.setStatus("failed");
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="bg-gray-100 p-4 rounded-lg w-full max-w-md mb-4">
        <h3 className="font-semibold mb-2">Connection Status:</h3>
        <p className="text-sm">
          {context.connection ? "Connected" : "Not connected"}
        </p>
      </div>

      <button
        onClick={handleRequestProof}
        disabled={!context.connection}
        className={`px-4 py-2 rounded text-white font-medium transition ${
          !context.connection ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        Request Proof
      </button>
    </div>
  );
}
