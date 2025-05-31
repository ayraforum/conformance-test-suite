"use client";

import React, { useState, useEffect } from "react";
import { TestRunner, TestStep, TestStepStatus } from "@/components/TestRunner";
import { useSocket } from "@/providers/SocketProvider";

// Types matching your existing backend
interface TaskNode {
  id: string;
  name: string;
  description: string;
  state: string;
  finished: boolean;
  stopped: boolean;
  task: {
    id: string;
    metadata: {
      name: string;
      id: string;
      description: string;
    };
    state: {
      status: string;
      runState: string;
      warnings: string[];
      messages: string[];
      errors: string[];
    };
  };
}

interface DAGData {
  status: {
    status: string;
    runState: string;
  };
  metadata: {
    name: string;
    id: string;
  };
  nodes: TaskNode[];
}

// Step components
function ConnectionStep({ 
  context, 
  isActive, 
  onNext 
}: { 
  context: any; 
  isActive: boolean; 
  onNext: () => void;
}) {
  const { socket, isConnected } = useSocket();
  const [hasStarted, setHasStarted] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('invitation', (url: string) => {
      console.log('Received invitation:', url);
      setInvitationUrl(url);
      setMessages(prev => [...prev, 'Received connection invitation']);
    });

    socket.on('dag-update', (data: { dag: DAGData }) => {
      if (data.dag?.nodes?.[0]?.task?.state?.messages) {
        const newMessages = data.dag.nodes[0].task.state.messages;
        setMessages(prev => {
          // Only add messages we haven't seen before
          const uniqueNewMessages = newMessages.filter(msg => !prev.includes(msg));
          return [...prev, ...uniqueNewMessages];
        });
      }
    });

    return () => {
      socket.off('invitation');
      socket.off('dag-update');
    };
  }, [socket]);

  const startConnection = async () => {
    if (!socket || !isConnected) {
      console.error('Not connected to server. Please refresh and try again.');
      return;
    }

    setHasStarted(true);
    setMessages(['Starting connection setup...']);
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const url = `${baseUrl}/api/select/pipeline?pipeline=ISSUER_TEST`;
      await fetch(url);
      console.log('Issuer pipeline selected');
      setMessages(prev => [...prev, 'Issuer pipeline selected']);
      
      // Small delay to ensure pipeline is selected
      setTimeout(async () => {
        // Start the pipeline execution
        const url = `${baseUrl}/api/run`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('Pipeline started');
        setMessages(prev => [...prev, 'Pipeline started']);
      }, 500);
    } catch (error) {
      console.error('Error starting issuer test:', error);
      console.error('Failed to start test. Please try again.');
      setMessages(prev => [...prev, 'Error: Failed to start test. Please try again.']);
    }
  };

  if (!isActive) return null;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Setup Connection</h4>
        <p className="text-blue-800 text-sm">
          This step will establish a connection with your issuer and prepare for credential issuance.
        </p>
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-gray-600">
          {isConnected ? 'Connected to backend' : 'Disconnected from backend'}
        </span>
      </div>

      {!hasStarted ? (
        <button
          onClick={startConnection}
          disabled={!isConnected}
          className="btn btn-blue"
        >
          Start Connection Setup
        </button>
      ) : (
        <div className="text-center py-4">
          {invitationUrl ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h5 className="font-medium mb-2">Scan QR Code</h5>
                <div className="flex justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invitationUrl)}`}
                    alt="Connection QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Connection URL:</p>
                  <p className="text-xs font-mono break-all text-gray-600">
                    {invitationUrl}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Scan this QR code with your holder wallet to establish a connection
                </p>
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12z"></path>
              </svg>
              <span className="ml-2 text-gray-600">Starting connection setup...</span>
            </div>
          )}
        </div>
      )}

      {/* Message Logger */}
      {messages.length > 0 && (
        <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h5 className="font-medium text-gray-700 mb-2">Step Log</h5>
          <div className="space-y-1">
            {messages.map((message, index) => (
              <div key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                <span>{message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CredentialStep({ 
  context, 
  isActive 
}: { 
  context: any; 
  isActive: boolean;
}) {
  if (!isActive) return null;

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">Credential Issuance</h4>
        <p className="text-green-800 text-sm">
          Your issuer will prepare and send a credential to the holder.
        </p>
      </div>
      
      <div className="text-center py-4">
        <div className="inline-flex items-center">
          <svg className="animate-spin h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12z"></path>
          </svg>
          <span className="ml-2 text-gray-600">Preparing credential issuance...</span>
        </div>
      </div>
    </div>
  );
}

function ReportStep({ 
  context, 
  isActive, 
  onRestart 
}: { 
  context: any; 
  isActive: boolean; 
  onRestart: () => void;
}) {
  if (!isActive) return null;

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">Test Complete!</h4>
        <p className="text-green-800 text-sm">
          Your issuer has successfully completed the conformance test.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium">Connection</span>
          </div>
          <p className="text-sm text-gray-600">Successfully established</p>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium">Issuance</span>
          </div>
          <p className="text-sm text-gray-600">Credential issued</p>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium">Compliance</span>
          </div>
          <p className="text-sm text-gray-600">Protocol compliant</p>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onRestart}
          className="btn btn-blue"
        >
          Run Another Test
        </button>
      </div>
    </div>
  );
}

export function IssuerTest() {
  const { socket } = useSocket();
  const [currentStep, setCurrentStep] = useState(0);
  const [dagData, setDagData] = useState<DAGData | null>(null);
  const [steps, setSteps] = useState<TestStep[]>([]);

  // Listen for DAG updates from your existing backend
  useEffect(() => {
    if (!socket) return;

    socket.on('dag-update', (data: { dag: DAGData }) => {
      console.log('DAG Update received:', data);
      if (data.dag) {
        setDagData(data.dag);
        updateStepsFromDAG(data.dag);
      }
    });

    return () => {
      socket.off('dag-update');
    };
  }, [socket]);

  // Convert DAG node status to test step status
  const getStepStatusFromNode = (node: TaskNode): TestStepStatus => {
    if (node.task.state.status === 'Accepted' || node.task.state.runState === 'completed') {
      return 'passed';
    }
    if (node.task.state.runState === 'running' || node.task.state.status === 'Running') {
      return 'running';
    }
    if (node.task.state.status === 'Failed' || node.task.state.runState === 'failed') {
      return 'failed';
    }
    return 'pending';
  };

  // Update steps based on DAG data
  const updateStepsFromDAG = (dag: DAGData) => {
    if (!dag.nodes || dag.nodes.length === 0) return;

    // Find the current running step
    let newCurrentStep = currentStep;
    const firstRunningNode = dag.nodes.findIndex(node => 
      node.task.state.runState === 'running' || node.task.state.status === 'Running'
    );
    const lastCompletedNode = dag.nodes.findIndex(node => 
      node.task.state.status === 'Accepted' || node.task.state.runState === 'completed'
    );

    if (firstRunningNode !== -1) {
      newCurrentStep = firstRunningNode;
    } else if (lastCompletedNode !== -1 && lastCompletedNode === dag.nodes.length - 1) {
      // All steps completed, go to report
      newCurrentStep = 2;
    } else if (lastCompletedNode !== -1) {
      // Move to next step after completed one
      newCurrentStep = Math.min(lastCompletedNode + 1, 2);
    }

    if (newCurrentStep !== currentStep) {
      setCurrentStep(newCurrentStep);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setDagData(null);
  };

  // Initialize steps
  useEffect(() => {
    const initialSteps: TestStep[] = [
      {
        id: 1,
        name: "Setup Connection",
        description: "Establish connection with the issuer",
        status: currentStep > 0 ? "passed" : currentStep === 0 ? "running" : "pending",
        component: (
          <ConnectionStep
            context={{}}
            isActive={currentStep === 0}
            onNext={() => setCurrentStep(1)}
          />
        ),
        isActive: currentStep === 0
      },
      {
        id: 2,
        name: "Issue Credential",
        description: "Issue a credential to the holder",
        status: currentStep > 1 ? "passed" : currentStep === 1 ? "running" : "pending",
        component: (
          <CredentialStep
            context={{}}
            isActive={currentStep === 1}
          />
        ),
        isActive: currentStep === 1
      },
      {
        id: 3,
        name: "Report",
        description: "Review the test results",
        status: currentStep === 2 ? "passed" : "pending",
        component: (
          <ReportStep
            context={{}}
            isActive={currentStep === 2}
            onRestart={handleRestart}
          />
        ),
        isActive: currentStep === 2
      }
    ];

    // Update step statuses based on DAG data
    if (dagData?.nodes) {
      dagData.nodes.forEach((node, index) => {
        if (initialSteps[index]) {
          const status = getStepStatusFromNode(node);
          initialSteps[index].status = status;
        }
      });
    }

    setSteps(initialSteps);
  }, [currentStep, dagData]);

  return (
    <div>
      <TestRunner
        title="Issue A Credential"
        description="This test verifies if an Issuer can establish a connection and issue a credential to a holder."
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onRestart={handleRestart}
      />
    </div>
  );
} 