"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { TestRunner, TestStep, TestStepStatus, TaskNode } from "@/components/TestRunner";
import { useSocket } from "@/providers/SocketProvider";
import { RootState } from "@/store";
import { startTest, resetTest, addMessage } from "@/store/testSlice";

// Types matching your existing backend
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

// Generalized Message Renderer Component
function MessageRenderer({ 
  messages, 
  title = "Step Log",
  className = "" 
}: { 
  messages: string[];
  title?: string;
  className?: string;
}) {
  if (messages.length === 0) return null;

  return (
    <div className={`mt-4 bg-gray-50 rounded-lg border border-gray-200 p-4 ${className}`}>
      <h5 className="font-medium text-gray-700 mb-2">{title}</h5>
      <div className="space-y-1">
        {messages.map((message, index) => (
          <div key={index} className="text-sm text-gray-600 flex items-start">
            <span className="text-gray-400 mr-2">•</span>
            <span>{message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Enhanced Task Details Component
function TaskDetailsRenderer({ 
  taskData,
  showButton = true,
  buttonText = "Show Details",
  buttonClassName = "px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
}: {
  taskData?: TaskNode;
  showButton?: boolean;
  buttonText?: string;
  buttonClassName?: string;
}) {
  const [showTaskDetails, setShowTaskDetails] = useState(false);

  if (!taskData) return null;

  return (
    <>
      {showButton && (
        <button
          onClick={() => setShowTaskDetails(!showTaskDetails)}
          className={buttonClassName}
        >
          {showTaskDetails ? 'Hide Details' : buttonText}
        </button>
      )}
      
      {showTaskDetails && (
        <div className="mt-4 p-3 bg-white rounded border">
          <h5 className="font-medium mb-2">Task Details</h5>
          <div className="text-sm space-y-1">
            <p><strong>Status:</strong> {taskData.task.state.status}</p>
            <p><strong>Run State:</strong> {taskData.task.state.runState}</p>
            <p><strong>Finished:</strong> {taskData.finished ? 'Yes' : 'No'}</p>
            {taskData.task.state.messages.length > 0 && (
              <div>
                <strong>Messages:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  {taskData.task.state.messages.map((msg, idx) => (
                    <li key={idx} className="text-gray-600">{msg}</li>
                  ))}
                </ul>
              </div>
            )}
            {taskData.task.state.warnings.length > 0 && (
              <div>
                <strong className="text-yellow-600">Warnings:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  {taskData.task.state.warnings.map((warn, idx) => (
                    <li key={idx} className="text-yellow-600">{warn}</li>
                  ))}
                </ul>
              </div>
            )}
            {taskData.task.state.errors.length > 0 && (
              <div>
                <strong className="text-red-600">Errors:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  {taskData.task.state.errors.map((err, idx) => (
                    <li key={idx} className="text-red-600">{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
function ConnectionStep({ 
  context, 
  isActive, 
  onNext,
  taskData 
}: { 
  context: any; 
  isActive: boolean; 
  onNext: () => void;
  taskData?: TaskNode;
}) {
  const dispatch = useDispatch();
  const { socket, isConnected } = useSocket();
  const { invitationUrl, messages } = useSelector((state: RootState) => state.test);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Get messages for this step (step 0)
  const stepMessages = messages[0] || [];

  useEffect(() => {
    // No longer need to handle socket events here since they're handled in SocketProvider
    // This component now just reacts to Redux state changes
  }, []);

  const startConnection = async () => {
    if (!socket || !isConnected) {
      console.error('Not connected to server. Please refresh and try again.');
      return;
    }

    setHasStarted(true);
    dispatch(addMessage({ stepIndex: 0, message: 'Starting connection setup...' }));
    dispatch(startTest()); // Start the test in Redux
    
    try {
      // Select the holder pipeline first
      await fetch('http://localhost:5005/api/select/pipeline?pipeline=HOLDER_TEST');
      console.log('Holder pipeline selected');
      dispatch(addMessage({ stepIndex: 0, message: 'Holder pipeline selected' }));
      
      // Small delay to ensure pipeline is selected
      setTimeout(async () => {
        // Start the pipeline execution
        await fetch('http://localhost:5005/api/run', {
          method: 'POST'
        });
        console.log('Pipeline started');
        dispatch(addMessage({ stepIndex: 0, message: 'Pipeline started' }));
      }, 500);
    } catch (error) {
      console.error('Error starting holder test:', error);
      console.error('Failed to start test. Please try again.');
      dispatch(addMessage({ stepIndex: 0, message: 'Error: Failed to start test. Please try again.' }));
    }
  };

  if (!isActive) return null;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Setup Connection</h4>
            <p className="text-blue-800 text-sm">
              This step will establish a connection with your holder wallet and prepare for credential presentation.
            </p>
          </div>
          <TaskDetailsRenderer 
            taskData={taskData}
            buttonClassName="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          />
        </div>
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

      <MessageRenderer 
        messages={stepMessages} 
        title="Connection Log"
      />
    </div>
  );
}

function PresentationStep({ 
  context, 
  isActive,
  taskData
}: { 
  context: any; 
  isActive: boolean;
  taskData?: TaskNode;
}) {
  const { messages } = useSelector((state: RootState) => state.test);
  
  // Get messages for this step (step 1)
  const stepMessages = messages[1] || [];

  useEffect(() => {
    // Socket events now handled in SocketProvider
    // This component just reacts to Redux state
  }, []);

  if (!isActive) return null;

  // Determine if we're waiting or if proof is being processed
  const isProcessingProof = taskData?.task?.state?.status === 'Running' || taskData?.task?.state?.status === 'Started';
  const isProofCompleted = taskData?.task?.state?.status === 'Accepted' || taskData?.task?.state?.status === 'Completed';

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-green-900 mb-2">Credential Presentation</h4>
            <p className="text-green-800 text-sm">
              Your wallet will receive a presentation request. Please respond with the requested credentials.
            </p>
          </div>
          <TaskDetailsRenderer 
            taskData={taskData}
            buttonClassName="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          />
        </div>
      </div>
      
      <div className="text-center py-4">
        {isProofCompleted ? (
          <div className="inline-flex items-center text-green-600">
            <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Credential presentation completed successfully!</span>
          </div>
        ) : isProcessingProof ? (
          <div className="inline-flex items-center text-blue-600">
            <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12z"></path>
            </svg>
            <span className="font-medium">Processing credential presentation...</span>
          </div>
        ) : (
          <div className="inline-flex items-center">
            <svg className="animate-spin h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12z"></path>
            </svg>
            <span className="text-gray-600">Waiting for credential presentation...</span>
          </div>
        )}
      </div>

      <MessageRenderer 
        messages={stepMessages} 
        title="Proof Request Log"
      />
    </div>
  );
}

function ReportStep({ 
  context, 
  isActive, 
  onRestart,
  dagData
}: { 
  context: any; 
  isActive: boolean; 
  onRestart: () => void;
  dagData?: DAGData;
}) {
  const [showFullReport, setShowFullReport] = useState(false);

  if (!isActive) return null;

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'completed':
        return 'text-green-600';
      case 'failed':
      case 'error':
        return 'text-red-600';
      case 'running':
      case 'started':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">Test Complete!</h4>
        <p className="text-green-800 text-sm">
          Your holder wallet has successfully completed the conformance test.
        </p>
      </div>
      
      {/* Summary Cards */}
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
            <span className="font-medium">Presentation</span>
          </div>
          <p className="text-sm text-gray-600">Credentials verified</p>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium">Compliance</span>
          </div>
          <p className="text-sm text-gray-600">Protocol compliant</p>
        </div>
      </div>

      {/* Detailed Report */}
      {dagData && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h5 className="font-semibold text-lg">Detailed Test Report</h5>
            <button
              onClick={() => setShowFullReport(!showFullReport)}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              {showFullReport ? 'Hide Details' : 'Show Full Report'}
            </button>
          </div>
          
          {/* Basic Report */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Test Name:</span>
              <span>{dagData.metadata.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Overall Status:</span>
              <span className={`font-medium ${getStatusColor(dagData.status.status)}`}>
                {dagData.status.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Run State:</span>
              <span className={`font-medium ${getStatusColor(dagData.status.runState)}`}>
                {dagData.status.runState}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Tasks:</span>
              <span>{dagData.nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Completed Tasks:</span>
              <span>{dagData.nodes.filter(n => n.finished).length}</span>
            </div>
          </div>

          {/* Full Report */}
          {showFullReport && (
            <div className="mt-6 border-t pt-4">
              <h6 className="font-medium mb-3">Task Details</h6>
              <div className="space-y-4">
                {dagData.nodes.map((node, index) => (
                  <div key={node.id} className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h7 className="font-medium">{node.name}</h7>
                      <span className={`text-sm ${getStatusColor(node.task.state.status)}`}>
                        {node.task.state.status}
                      </span>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <p><strong>Description:</strong> {node.description || 'No description'}</p>
                      <p><strong>State:</strong> {node.state}</p>
                      <p><strong>Run State:</strong> {node.task.state.runState}</p>
                      <p><strong>Finished:</strong> {node.finished ? 'Yes' : 'No'}</p>
                      
                      {node.task.state.messages.length > 0 && (
                        <div>
                          <strong>Messages:</strong>
                          <ul className="list-disc list-inside ml-2 mt-1 max-h-32 overflow-y-auto">
                            {node.task.state.messages.map((msg, idx) => (
                              <li key={idx} className="text-gray-600 text-xs">{msg}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {node.task.state.warnings.length > 0 && (
                        <div>
                          <strong className="text-yellow-600">Warnings:</strong>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {node.task.state.warnings.map((warn, idx) => (
                              <li key={idx} className="text-yellow-600 text-xs">{warn}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {node.task.state.errors.length > 0 && (
                        <div>
                          <strong className="text-red-600">Errors:</strong>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {node.task.state.errors.map((err, idx) => (
                              <li key={idx} className="text-red-600 text-xs">{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Export Report */}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    const reportData = {
                      testName: dagData.metadata.name,
                      testId: dagData.metadata.id,
                      timestamp: new Date().toISOString(),
                      overallStatus: dagData.status,
                      tasks: dagData.nodes.map(node => ({
                        name: node.name,
                        description: node.description,
                        status: node.task.state.status,
                        runState: node.task.state.runState,
                        finished: node.finished,
                        messages: node.task.state.messages,
                        warnings: node.task.state.warnings,
                        errors: node.task.state.errors
                      }))
                    };
                    
                    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                      type: 'application/json'
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `holder-test-report-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Export Report as JSON
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

export function HolderTest() {
  const dispatch = useDispatch();
  const { socket } = useSocket();
  const { currentStep, testCompleted } = useSelector((state: RootState) => state.test);
  const { dag } = useSelector((state: RootState) => state.dag);
  const [steps, setSteps] = useState<TestStep[]>([]);

  // Listen for DAG updates from your existing backend
  useEffect(() => {
    console.log('HolderTest - Component mounted, currentStep:', currentStep);
  }, [currentStep]);

  // Convert DAG node status to test step status
  const getStepStatusFromNode = (node: TaskNode): TestStepStatus => {
    // Check for completed states
    if (node.task.state.status === 'Accepted' || 
        node.task.state.runState === 'completed' || 
        node.task.state.status === 'Completed') {
      return 'passed';
    }
    
    // Check for running states
    if (node.task.state.runState === 'running' || 
        node.task.state.status === 'Running' ||
        node.task.state.status === 'Started' ||
        node.task.state.runState === 'Started') {
      return 'running';
    }
    
    // Check for failed states
    if (node.task.state.status === 'Failed' || 
        node.task.state.runState === 'failed' ||
        node.task.state.status === 'Error') {
      return 'failed';
    }
    
    // Default to pending for all other states
    return 'pending';
  };

  const handleRestart = useCallback(() => {
    dispatch(resetTest());
  }, [dispatch]);

  // Initialize steps
  useEffect(() => {
    const initialSteps: TestStep[] = [
      {
        id: 1,
        name: "Setup Connection",
        description: "Establish connection with the holder wallet",
        status: currentStep > 0 ? "passed" : currentStep === 0 ? "running" : "pending",
        component: (
          <ConnectionStep
            context={{}}
            isActive={currentStep === 0}
            onNext={() => {}} // Navigation handled by Redux middleware
            taskData={dag?.nodes?.[0]}
          />
        ),
        isActive: currentStep === 0,
        taskData: dag?.nodes?.[0]
      },
      {
        id: 2,
        name: "Request Proof",
        description: "Request presentation of credentials",
        status: currentStep > 1 ? "passed" : currentStep === 1 ? "running" : "pending",
        component: (
          <PresentationStep
            context={{}}
            isActive={currentStep === 1}
            taskData={dag?.nodes?.[1]}
          />
        ),
        isActive: currentStep === 1,
        taskData: dag?.nodes?.[1]
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
            dagData={dag}
          />
        ),
        isActive: currentStep === 2
      }
    ];

    // Update step statuses based on DAG data
    if (dag?.nodes) {
      dag.nodes.forEach((node, index) => {
        if (initialSteps[index]) {
          const status = getStepStatusFromNode(node);
          initialSteps[index].status = status;
          initialSteps[index].taskData = node;
        }
      });
    }

    setSteps(initialSteps);
  }, [currentStep, dag, handleRestart]);

  return (
    <div>
      <TestRunner
        title="Holder Wallet Conformance Test"
        description="This test verifies if a Holder Wallet can establish a connection and present a credential that was previously issued."
        steps={steps}
        currentStep={currentStep}
        onRestart={handleRestart}
      />
    </div>
  );
}
