import React, { useState, useEffect } from "react";
import { HolderContext } from "@/services/tests/HolderContext";
import { TestStepController } from "@/services/BaseTestContext";
import RenderQRCode from "@/components/RenderQRCode";
import { createInvitation, waitForConnection } from "@/services/invitation";

interface ConnectionStepProps {
  context: HolderContext;
  controller: TestStepController;
  isActive: boolean;
}

export function ConnectionStep({ context, controller, isActive }: ConnectionStepProps) {
  const [qrValue, setQrValue] = useState("");
  const [invitation, setInvitation] = useState<{ id: string; url: string } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // Mark step as waiting when active
  useEffect(() => {
    if (isActive) {
      controller.setStatus("waiting");
    }
  }, [isActive, controller]);
  
  // Create invitation when component becomes active
  useEffect(() => {
    if (isActive && !invitation) {
      const newInvitation = createInvitation('Ayra Holder Test');
      setInvitation({
        id: newInvitation.id,
        url: newInvitation.url
      });
      setQrValue(newInvitation.url);
    }
  }, [isActive, invitation]);
  
  // Simulated polling for connection status
  const startPolling = async () => {
    if (!invitation || isPolling) return;
    
    setIsPolling(true);
    controller.setStatus("running");
    
    try {
      const connected = await waitForConnection(invitation.id);
      
      if (connected) {
        // Update context with connection details
        controller.updateContext({
          connectionId: invitation.id,
          connectionStatus: "active"
        });
        controller.setStatus("passed");
        controller.complete(true);
        controller.goToNextStep();
      } else {
        // Connection failed
        controller.setError("Connection timed out or was rejected");
        controller.setStatus("failed");
      }
    } catch (error) {
      controller.setError(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      controller.setStatus("failed");
    } finally {
      setIsPolling(false);
    }
  };
  
  // Start polling when QR code is displayed
  useEffect(() => {
    if (invitation && isActive && !isPolling && !context.connectionStatus) {
      startPolling();
    }
  }, [invitation, isActive, isPolling, context.connectionStatus]);
  
  return (
    <div className="flex flex-col items-center p-4 border border-gray-300 rounded">
      <p className="mb-4 text-center text-sm text-gray-600">
        Scan this QR code with your mobile wallet app to establish a connection.
      </p>
      
      <div className="bg-white p-4 rounded-lg shadow-md">
        {qrValue ? (
          <RenderQRCode
            value={qrValue}
            size={200}
          />
        ) : (
          <div className="w-200 h-200 flex items-center justify-center bg-gray-100">
            <span className="text-gray-400">Generating invitation...</span>
          </div>
        )}
      </div>
      
      <p className="mt-4 text-center text-sm text-gray-500">
        {isPolling ? "Waiting for connection..." : "Scan this QR code with your mobile wallet app"}
      </p>
      
      <button
        onClick={() => {
          // For demo purposes, simulate connection completion
          controller.updateContext({
            connectionId: invitation?.id || "conn-" + Math.random().toString(36).substring(2, 10),
            connectionStatus: "active"
          });
          controller.setStatus("passed");
          controller.complete(true);
          controller.goToNextStep();
        }}
        disabled={isPolling}
        className={`mt-4 px-4 py-2 rounded text-white font-medium transition ${isPolling 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-blue-500 hover:bg-blue-600'}`}
      >
        {isPolling ? "Connecting..." : "Simulate Connection (Demo)"}
      </button>
    </div>
  );
}
