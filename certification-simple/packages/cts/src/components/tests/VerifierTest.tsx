"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { TestRunner, TestStep, TestStepStatus, TaskNode } from "@/components/TestRunner";
import { useSocket } from "@/providers/SocketProvider";
import { RootState } from "@/store";
import { startTest, resetTest, addMessage } from "@/store/testSlice";

// Simple Message Renderer Component
function MessageRenderer({ messages, title = "Step Log" }: { messages: string[]; title?: string; }) {
  if (messages.length === 0) return null;

  return (
    <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-4">
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

// Connection Step Component
function VerifierConnectionStep({ isActive, taskData }: { isActive: boolean; taskData?: TaskNode; }) {
  const dispatch = useDispatch();
  const { socket, isConnected } = useSocket();
  const { messages } = useSelector((state: RootState) => state.test);
  const [hasStarted, setHasStarted] = useState(false);
  const [oobUrl, setOobUrl] = useState<string>("");
  
  const stepMessages = messages[0] || [];

  const startVerifierTest = async () => {
    if (!socket || !isConnected) {
      console.error('Not connected to server. Please refresh and try again.');
      return;
    }

    if (!oobUrl.trim()) {
      dispatch(addMessage({ stepIndex: 0, message: 'Error: Please enter an OOB URL' }));
      return;
    }

    setHasStarted(true);
    dispatch(addMessage({ stepIndex: 0, message: 'Starting verifier test...' }));
    dispatch(startTest());
    
    try {
      const pipelineResponse = await fetch('http://localhost:5005/api/select/pipeline?pipeline=VERIFIER_TEST');
      if (!pipelineResponse.ok) {
        throw new Error(`Failed to select pipeline: ${pipelineResponse.statusText}`);
      }
      dispatch(addMessage({ stepIndex: 0, message: 'Verifier pipeline selected' }));
      
      setTimeout(async () => {
        const runResponse = await fetch('http://localhost:5005/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oobUrl }),
        });
        if (!runResponse.ok) {
          throw new Error(`Failed to start pipeline: ${runResponse.statusText}`);
        }
        dispatch(addMessage({ stepIndex: 0, message: 'Pipeline started' }));
      }, 500);
    } catch (error) {
      console.error('Error starting verifier test:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start test. Please try again.';
      dispatch(addMessage({ stepIndex: 0, message: `Error: ${errorMessage}` }));
      setHasStarted(false);
    }
  };

  if (!isActive) return null;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Setup Connection</h4>
        <p className="text-blue-800 text-sm">
          This step will process your verifier's OOB URL and establish a connection for testing.
        </p>
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-gray-600">
          {isConnected ? 'Connected to backend' : 'Disconnected from backend'}
        </span>
      </div>

      {!hasStarted ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="oobUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Verifier OOB URL
            </label>
            <input
              type="text"
              id="oobUrl"
              value={oobUrl}
              onChange={(e) => setOobUrl(e.target.value)}
              placeholder="Enter the out-of-band URL from your verifier"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={startVerifierTest}
            disabled={!isConnected || !oobUrl.trim()}
            className="btn btn-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Verifier Test
          </button>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="inline-flex items-center">
            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12z"></path>
            </svg>
            <span className="ml-2 text-gray-600">Processing verifier connection...</span>
          </div>
        </div>
      )}

      <MessageRenderer messages={stepMessages} title="Connection Log" />
    </div>
  );
}

// Generic Step Component for steps 1-5
function GenericVerifierStep({ 
  isActive, 
  stepIndex, 
  title, 
  description, 
  taskData 
}: { 
  isActive: boolean; 
  stepIndex: number;
  title: string;
  description: string;
  taskData?: TaskNode; 
}) {
  const { messages } = useSelector((state: RootState) => state.test);
  const stepMessages = messages[stepIndex] || [];

  if (!isActive) return null;

  const isProcessing = taskData?.task?.state?.status === 'Running' || taskData?.task?.state?.status === 'Started';
  const isCompleted = taskData?.task?.state?.status === 'Accepted' || taskData?.task?.state?.status === 'Completed';

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-gray-800 text-sm">{description}</p>
      </div>
      
      <div className="text-center py-4">
        {isCompleted ? (
          <div className="inline-flex items-center text-green-600">
            <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Step completed successfully!</span>
          </div>
        ) : isProcessing ? (
          <div className="inline-flex items-center text-blue-600">
            <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12z"></path>
            </svg>
            <span className="font-medium">Processing...</span>
          </div>
        ) : (
          <div className="inline-flex items-center">
            <svg className="animate-spin h-5 w-5 text-gray-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12z"></path>
            </svg>
            <span className="text-gray-600">Waiting...</span>
          </div>
        )}
      </div>

      <MessageRenderer messages={stepMessages} title={`${title} Log`} />
    </div>
  );
}

// Report Step Component
function ReportStep({ isActive, onRestart, dagData }: { isActive: boolean; onRestart: () => void; dagData?: any; }) {
  if (!isActive) return null;

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">Verifier Test Complete!</h4>
        <p className="text-green-800 text-sm">
          Your verifier has successfully completed the conformance test.
        </p>
      </div>
      
      <div className="text-center">
        <button onClick={onRestart} className="btn btn-blue">
          Run Another Test
        </button>
      </div>
    </div>
  );
}

export function VerifierTest() {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.test);
  const { dag } = useSelector((state: RootState) => state.dag);
  const [steps, setSteps] = useState<TestStep[]>([]);

  // Convert DAG node status to test step status
  const getStepStatusFromNode = (node: TaskNode): TestStepStatus => {
    if (node.task.state.status === 'Accepted' || node.task.state.status === 'Completed') {
      return 'passed';
    }
    if (node.task.state.status === 'Running' || node.task.state.status === 'Started') {
      return 'running';
    }
    if (node.task.state.status === 'Failed' || node.task.state.status === 'Error') {
      return 'failed';
    }
    return 'pending';
  };

  const handleRestart = useCallback(() => {
    dispatch(resetTest());
  }, [dispatch]);

  // Initialize steps
  useEffect(() => {
    const stepDefinitions = [
      { name: "Setup Connection", description: "Process OOB URL and establish connection with verifier" },
      { name: "Send Presentation", description: "Send the requested presentation to the verifier" },
      { name: "Wait for Verification", description: "Wait for the verifier to process and verify the presentation" },
      { name: "Evaluate Results", description: "Evaluate verifier's conformance based on test results" }
    ];

    const initialSteps: TestStep[] = [];

    // Add the connection step (special handling)
    initialSteps.push({
      id: 1,
      name: stepDefinitions[0].name,
      description: stepDefinitions[0].description,
      status: currentStep > 0 ? "passed" : currentStep === 0 ? "running" : "pending",
      component: (
        <VerifierConnectionStep
          isActive={currentStep === 0}
          taskData={dag?.nodes?.[0]}
        />
      ),
      isActive: currentStep === 0,
      taskData: dag?.nodes?.[0]
    });

    // Add steps 1-5 (generic steps)
    for (let i = 1; i < 4; i++) {
      initialSteps.push({
        id: i + 1,
        name: stepDefinitions[i].name,
        description: stepDefinitions[i].description,
        status: currentStep > i ? "passed" : currentStep === i ? "running" : "pending",
        component: (
          <GenericVerifierStep
            isActive={currentStep === i}
            stepIndex={i}
            title={stepDefinitions[i].name}
            description={stepDefinitions[i].description}
            taskData={dag?.nodes?.[i]}
          />
        ),
        isActive: currentStep === i,
        taskData: dag?.nodes?.[i]
      });
    }

    // Add report step
    initialSteps.push({
      id: 7,
      name: "Report",
      description: "Review the complete test results",
      status: currentStep === 6 ? "passed" : "pending",
      component: (
        <ReportStep
          isActive={currentStep === 6}
          onRestart={handleRestart}
          dagData={dag}
        />
      ),
      isActive: currentStep === 6
    });

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
        title="Verifier Conformance Test"
        description="This test verifies if a Verifier implements the required functionality for connection, presentation request, and verification."
        steps={steps}
        currentStep={currentStep}
        onRestart={handleRestart}
      />
    </div>
  );
}
