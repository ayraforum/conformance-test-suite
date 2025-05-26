import React, { useState, useEffect } from "react";
import { VerifierContext } from "@/services/tests/VerifierContext";
import { TestStepController } from "@/services/BaseTestContext";
import RenderQRCode from "@/components/RenderQRCode";
import { createInvitation, waitForConnection, simulateConnection } from "@/services/connection";
import { getBaseUrl, getNgrokUrl } from "@/services/agentService";

interface VerifierConnectionStepProps {
  context: VerifierContext;
  controller: TestStepController;
  isActive: boolean;
}

export function VerifierConnectionStep({ context, controller, isActive }: VerifierConnectionStepProps) {
  const [qrValue, setQrValue] = useState("");
  const [invitation, setInvitation] = useState<{ id: string; url: string; oobInvitation: any } | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingStarted, setWaitingStarted] = useState(false);
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mark step as waiting when active
  useEffect(() => {
    if (isActive) {
      controller.setStatus("waiting");
      setBaseUrl(getBaseUrl());
    }
  }, [isActive, controller]);
  
  // Create invitation when component becomes active
  useEffect(() => {
    if (isActive && !invitation && !isLoading) {
      const createConnectionInvitation = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          console.log("Creating verifier connection invitation...");
          
          // Show the base URL being used
          const currentBaseUrl = getBaseUrl();
          const ngrokUrl = getNgrokUrl();
          console.log(`Using base URL: ${currentBaseUrl}`);
          if (ngrokUrl) {
            console.log(`Using ngrok tunnel: ${ngrokUrl}`);
          }
          
          // Create the invitation
          const newInvitation = await createInvitation('Ayra Verifier Test');
          
          console.log("Verifier invitation created:", newInvitation);
          setInvitation(newInvitation);
          setQrValue(newInvitation.url);
          setBaseUrl(currentBaseUrl);
        } catch (error) {
          console.error("Error creating verifier invitation:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          setError(`Failed to create invitation: ${errorMessage}`);
          controller.setError(`Failed to create invitation: ${errorMessage}`);
          controller.setStatus("failed");
        } finally {
          setIsLoading(false);
        }
      };
      
      createConnectionInvitation();
    }
  }, [isActive, invitation, controller, isLoading]);
  
  // Start waiting for connection
  const startWaiting = async () => {
    if (!invitation || isWaiting) return;
    
    setIsWaiting(true);
    setWaitingStarted(true);
    controller.setStatus("running");
    
    try {
      console.log("Waiting for verifier connection...");
      const connected = await waitForConnection(invitation.id);
      
      if (connected) {
        console.log("Verifier connection established successfully");
        // Update context with connection details
        controller.updateContext({
          connectionId: invitation.id,
          connectionStatus: "active",
          oobInvitation: invitation.oobInvitation
        });
        controller.setStatus("passed");
        controller.complete(true);
        controller.goToNextStep();
      }
    } catch (error) {
      console.error("Verifier connection failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Connection failed: ${errorMessage}`);
      controller.setError(`Connection failed: ${errorMessage}`);
      controller.setStatus("failed");
      setIsWaiting(false);
    }
  };
  
  const retryInvitation = () => {
    setInvitation(null);
    setQrValue("");
    setError(null);
    controller.setError(null);
    controller.setStatus("waiting");
  };
  
  return (
    <div className="flex flex-col items-center p-4 border border-gray-300 rounded">
      <div className="mb-4 text-center text-sm">
        <p className="text-gray-600 mb-2">
          Scan this QR code with your mobile wallet app to establish a connection for verification.
        </p>
        
        {baseUrl && (
          <p className="text-xs text-gray-500">
            Using connection URL from: <span className="font-mono bg-gray-100 px-1 rounded">{baseUrl}</span>
          </p>
        )}
        
        {getNgrokUrl() && (
          <p className="text-xs text-green-500 mt-1">
            ✓ <span className="font-semibold">ngrok tunnel active:</span> <span className="font-mono bg-gray-100 px-1 rounded">{getNgrokUrl()}</span>
          </p>
        )}
        
        {invitation && (
          <p className="text-xs text-gray-500 mt-1">
            Invitation ID: <span className="font-mono bg-gray-100 px-1 rounded">{invitation.id}</span>
          </p>
        )}
      </div>
      
      {error && (
        <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
          <button 
            onClick={retryInvitation} 
            className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md text-xs font-medium transition"
          >
            Retry
          </button>
        </div>
      )}
      
      <div className="bg-white p-4 rounded-lg shadow-md">
        {isLoading ? (
          <div className="w-200 h-200 flex flex-col items-center justify-center bg-gray-100">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full mb-2"></div>
            <span className="text-gray-400">Generating invitation...</span>
          </div>
        ) : qrValue ? (
          <RenderQRCode
            value={qrValue}
            size={200}
          />
        ) : (
          <div className="w-200 h-200 flex items-center justify-center bg-gray-100">
            <span className="text-gray-400">No invitation available</span>
          </div>
        )}
      </div>
      
      {qrValue && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500 break-all max-w-md">
            {qrValue}
          </p>
        </div>
      )}
      
      <p className="mt-4 text-center text-sm text-gray-500">
        {isWaiting ? "Waiting for connection..." : "Ready to establish connection"}
      </p>
      
      <div className="mt-4 flex flex-col md:flex-row gap-3">
        {!waitingStarted && (
          <button
            onClick={startWaiting}
            disabled={isWaiting || !invitation || isLoading}
            className={`px-4 py-2 rounded text-white font-medium transition ${
              isWaiting || !invitation || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            Start Waiting for Connection
          </button>
        )}
        
        <button
          onClick={() => {
            // For demo purposes, simulate connection completion
            if (invitation) {
              simulateConnection(invitation.id);
            } else {
              const mockId = "conn-" + Math.random().toString(36).substring(2, 10);
              controller.updateContext({
                connectionId: mockId,
                connectionStatus: "active"
              });
              controller.setStatus("passed");
              controller.complete(true);
              controller.goToNextStep();
            }
          }}
          disabled={isWaiting && !waitingStarted || isLoading}
          className={`px-4 py-2 rounded text-white font-medium transition ${
            isWaiting && !waitingStarted || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          Simulate Connection (Demo)
        </button>
      </div>
      
      {isWaiting && (
        <div className="mt-4 flex items-center">
          <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          <p className="text-sm text-gray-600">Waiting for wallet to connect...</p>
        </div>
      )}
    </div>
  );
}
