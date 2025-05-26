import React, { useEffect } from "react";
import { HolderContext } from "@/services/tests/HolderContext";
import { TestStepController } from "@/services/BaseTestContext";

interface ConnectionStepProps {
  context: HolderContext;
  controller: TestStepController;
  isActive: boolean;
}

export function ConnectionStep({ context, controller, isActive }: ConnectionStepProps) {
  useEffect(() => {
    if (isActive) {
      controller.setStatus("running");
    }
  }, [isActive, controller]);

  const handleSimulateConnection = async () => {
    try {
      // Simulate connection for demo
      controller.updateContext({ connection: true });
      controller.setStatus("passed");
      controller.complete(true);
      controller.goToNextStep();
    } catch (error) {
      console.error('Error simulating connection:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      controller.setError(`Failed to simulate connection: ${errorMessage}`);
      controller.setStatus("failed");
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="bg-gray-100 p-4 rounded-lg w-full max-w-md mb-4">
        <h3 className="font-semibold mb-2">Connection Status:</h3>
        <p className="text-sm">
          {context.connection ? "Connected" : "Waiting for connection..."}
        </p>
      </div>

      <button
        onClick={handleSimulateConnection}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        Simulate Connection (Demo)
      </button>
    </div>
  );
}
