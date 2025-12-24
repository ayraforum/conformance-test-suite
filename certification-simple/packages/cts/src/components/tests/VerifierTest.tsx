"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { TestRunner, TestStep, TestStepStatus } from "@/components/TestRunner";
import { TaskNode } from "@/types/DAGNode";
import { DetailedReport } from "@/components/common/DetailedReport";
import { useSocket } from "@/providers/SocketProvider";
import { RootState } from "@/store";
import { startTest, resetTest, addMessage } from "@/store/testSlice";
import jsQR from "jsqr";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";

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
  const [qrError, setQrError] = useState<string | null>(null);
  const [isDecodingQr, setIsDecodingQr] = useState(false);
  
  const stepMessages = messages[0] || [];

  const decodeQrFile = useCallback(
    (file: File) => {
      setQrError(null);
      setIsDecodingQr(true);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setQrError("Unable to read QR image");
            setIsDecodingQr(false);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            const decoded = code.data.trim();
            setOobUrl(decoded);
            dispatch(addMessage({ stepIndex: 0, message: "Decoded OOB URL from QR image" }));
            setQrError(null);
          } else {
            setQrError("Could not decode a QR code from the image");
          }
          setIsDecodingQr(false);
        };
        img.onerror = () => {
          setQrError("Failed to load QR image");
          setIsDecodingQr(false);
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        setQrError("Failed to read QR file");
        setIsDecodingQr(false);
      };
      reader.readAsDataURL(file);
    },
    [dispatch]
  );

  const onQrFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      decodeQrFile(file);
      // Reset the input so selecting the same file again still triggers change.
      event.target.value = "";
    }
  };

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
      const baseUrl = API_BASE_URL;
      const url = `${baseUrl}/api/select/pipeline?pipeline=VERIFIER_TEST`;
      const pipelineResponse = await fetch(url);
      if (!pipelineResponse.ok) {
        throw new Error(`Failed to select pipeline: ${pipelineResponse.statusText}`);
      }
      dispatch(addMessage({ stepIndex: 0, message: 'Verifier pipeline selected' }));
      
      setTimeout(async () => {
        const url = `${baseUrl}/api/run`;
        const runResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oobUrl, pipelineType: 'VERIFIER_TEST' }),
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
          This step processes the verifier's DIDComm v2 OOB invitation and establishes a connection for the Ayra card proof.
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
          <div>
            <label htmlFor="oobQr" className="block text-sm font-medium text-gray-700 mb-2">
              Or upload a QR code image
            </label>
            <input
              id="oobQr"
              type="file"
              accept="image/*"
              onChange={onQrFileSelected}
              className="block w-full text-sm text-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              We will decode the QR and populate the invitation URL automatically.
            </p>
            {isDecodingQr && (
              <p className="text-sm text-blue-600 mt-1">Decoding QR image…</p>
            )}
            {qrError && (
              <p className="text-sm text-red-600 mt-1">{qrError}</p>
            )}
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
    <DetailedReport 
      dagData={dagData}
      testType="Verifier"
      onRestart={onRestart}
    />
  );
}

export function VerifierTest() {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.test);
  const { dag } = useSelector((state: RootState) => state.dag);
  const [steps, setSteps] = useState<TestStep[]>([]);

  // Convert DAG node status to test step status
  const getStepStatusFromNode = (node: TaskNode): TestStepStatus => {
    const status = (node.task.state.status || "").toLowerCase();
    const runState = (node.task.state.runState || "").toLowerCase();

    // Important: tasks often set runState=completed even when they fail. Always check failure first.
    if (status === "failed" || status === "error" || runState === "failed" || runState === "error") {
      return "failed";
    }
    if (status === "accepted" || status === "passed") {
      return "passed";
    }
    if (status === "waiting") {
      return "waiting";
    }
    if (status === "running" || status === "started" || runState === "running") {
      return "running";
    }
    return "pending";
  };

  const updateStepStatus = (node: TaskNode, index: number): void => {
    const status = getStepStatusFromNode(node);
    setSteps(prevSteps => {
      const newSteps = [...prevSteps];
      if (newSteps[index]) {
        newSteps[index] = {
          ...newSteps[index],
          status,
          taskData: node
        };
      }
      return newSteps;
    });
  };

  const handleRestart = useCallback(() => {
    dispatch(resetTest());
  }, [dispatch]);

  // Initialize steps
  useEffect(() => {
    const stepDefinitions = [
      { name: "Accept Invitation", description: "Consume the verifier's DIDComm v2 OOB invitation and connect" },
      { name: "Await Proof Request", description: "Wait for a Presentation Exchange v2 request for the Ayra Business Card" },
      { name: "Send Presentation", description: "Respond with the Ayra Business Card (Ed25519Signature2020) presentation" },
      { name: "Wait for Verification", description: "Wait for the verifier to process and verify the presentation" },
      { name: "Evaluate Results", description: "Evaluate verifier conformance from the exchange" }
    ];

    const dagNodes = dag?.nodes || [];
    const resolvedStepDefinitions = Array.from(
      { length: Math.max(stepDefinitions.length, dagNodes.length || 0) },
      (_, i) => ({
        name: stepDefinitions[i]?.name || dagNodes[i]?.task?.metadata?.name || `Step ${i + 1}`,
        description: stepDefinitions[i]?.description || dagNodes[i]?.task?.metadata?.description || "",
      })
    );

    const initialSteps: TestStep[] = [];

    // Add the connection step (uses OOB URL input)
    initialSteps.push({
      id: 1,
      name: "Setup Test",
      description: "Process OOB URL and initialize verifier test",
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

    // Add backend pipeline steps derived from the DAG
    for (let i = 0; i < resolvedStepDefinitions.length; i++) {
      const stepNum = i + 1;
      initialSteps.push({
        id: stepNum + 1,
        name: resolvedStepDefinitions[i].name,
        description: resolvedStepDefinitions[i].description,
        status: currentStep > stepNum ? "passed" : currentStep === stepNum ? "running" : "pending",
        component: (
          <GenericVerifierStep
            isActive={currentStep === stepNum}
            stepIndex={stepNum}
            title={resolvedStepDefinitions[i].name}
            description={resolvedStepDefinitions[i].description}
            taskData={dag?.nodes?.[i]}
          />
        ),
        isActive: currentStep === stepNum,
        taskData: dag?.nodes?.[i]
      });
    }

    // Add report step (after all 6 backend steps)
    const reportStepIndex = resolvedStepDefinitions.length + 1;
    initialSteps.push({
      id: reportStepIndex + 1,
      name: "Report",
      description: "Review the complete test results and conformance report",
      status: currentStep === reportStepIndex ? "passed" : "pending",
      component: (
        <ReportStep
          isActive={currentStep === reportStepIndex}
          onRestart={handleRestart}
          dagData={dag}
        />
      ),
      isActive: currentStep === reportStepIndex
    });

    // Update step statuses based on DAG data
    if (dag?.nodes) {
      dag.nodes.forEach((node: TaskNode, index: number) => {
        // Offset by 1 because first step is the setup step
        const stepIndex = index + 1;
        if (initialSteps[stepIndex]) {
          updateStepStatus(node, stepIndex);
        }
      });
      
      // Check if all backend steps are complete to show report
      const allNodesComplete = dag.nodes.every((node: TaskNode) => 
        node.task.state.status === 'Accepted' || 
        node.task.state.status === 'Completed' ||
        node.task.state.status === 'Failed' ||
        node.task.state.status === 'Error'
      );
      
      if (allNodesComplete && currentStep < reportStepIndex) {
        // Auto-advance to report step when all backend steps are done
        console.log('All verifier pipeline steps complete, showing report');
        // Note: In a real app, you might dispatch an action to advance the step
        // For now, we'll rely on the Redux middleware to handle step progression
      }
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
