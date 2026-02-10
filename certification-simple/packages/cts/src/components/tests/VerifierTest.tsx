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
function VerifierConnectionStep({
  isActive,
  taskData,
  verifyTrqp,
  onVerifyTrqpChange,
}: {
  isActive: boolean;
  taskData?: TaskNode;
  verifyTrqp: boolean;
  onVerifyTrqpChange: (value: boolean) => void;
}) {
  const dispatch = useDispatch();
  const { socket, isConnected } = useSocket();
  const { messages } = useSelector((state: RootState) => state.test);
  const [hasStarted, setHasStarted] = useState(false);
  const [oobUrl, setOobUrl] = useState<string>("");
  const [qrError, setQrError] = useState<string | null>(null);
  const [isDecodingQr, setIsDecodingQr] = useState(false);
  const [isLoadingInternalInvitation, setIsLoadingInternalInvitation] = useState(false);
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
    if (verifyTrqp) {
      dispatch(addMessage({ stepIndex: 0, message: 'TRQP enforcement enabled: verifier flow will run twice on the same connection' }));
    }
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
          body: JSON.stringify({
            oobUrl,
            pipelineType: 'VERIFIER_TEST',
            verifyTRQP: verifyTrqp,
          }),
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

  const useInternalVerifierInvitation = async () => {
    setQrError(null);
    setIsLoadingInternalInvitation(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/verifier/internal-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({} as any));
      if (!response.ok) {
        const message = data?.error || data?.details || response.statusText;
        throw new Error(message || "Failed to fetch internal verifier invitation");
      }
      const invitationUrl = typeof data?.invitationUrl === "string" ? data.invitationUrl : "";
      if (!invitationUrl) {
        throw new Error("No invitation URL returned");
      }
      setOobUrl(invitationUrl);
      dispatch(addMessage({ stepIndex: 0, message: "Loaded OOB URL from internal verifier" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setQrError(`Internal verifier invitation failed: ${message}`);
      dispatch(addMessage({ stepIndex: 0, message: `Internal verifier invitation failed: ${message}` }));
    } finally {
      setIsLoadingInternalInvitation(false);
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
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={useInternalVerifierInvitation}
                disabled={isLoadingInternalInvitation}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  isLoadingInternalInvitation
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                }`}
              >
                {isLoadingInternalInvitation ? "Loading..." : "Use Internal Verifier Invitation"}
              </button>
              <span className="text-xs text-gray-500">
                Uses the internal ACA-Py verifier when configured.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <input
              id="verifyTrqp"
              type="checkbox"
              checked={verifyTrqp}
              onChange={(e) => onVerifyTrqpChange(e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="verifyTrqp" className="text-sm text-gray-700">
              Enforce Trust Registry (TRQP) checks for the verifier
            </label>
          </div>
          {verifyTrqp && (
            <p className="text-xs text-gray-500">
              TRQP enforcement runs the verifier flow twice and reuses the same connection. Send a second proof
              request on the existing connection after CTS disables authorization.
            </p>
          )}
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

  const statusValue = (taskData?.task?.state?.status || "").toLowerCase();
  const runStateValue = (taskData?.task?.state?.runState || "").toLowerCase();
  const isProcessing = statusValue === "running" || statusValue === "started" || runStateValue === "running";
  const isCompleted = statusValue === "accepted" || statusValue === "completed";
  const isFailed = statusValue === "failed" || statusValue === "error" || runStateValue === "failed";
  const isVerifierResponseStep = title.toLowerCase().includes("verifier response") || title.toLowerCase().includes("wait for verification");
  const showFailure = isFailed;
  const failureMessage =
    taskData?.task?.state?.errors?.[0] ||
    taskData?.task?.state?.messages?.slice(-1)?.[0] ||
    (isVerifierResponseStep ? "Verifier response indicated a failure." : "Step failed.");

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-gray-800 text-sm">{description}</p>
      </div>
      
      <div className="text-center py-4">
        {showFailure ? (
          <div className="inline-flex items-center text-red-600">
            <span className="mr-2 text-lg">❌</span>
            <span className="font-medium">
              {isVerifierResponseStep ? "Verifier response failed" : "Step failed"}
            </span>
          </div>
        ) : isCompleted ? (
          <div className="inline-flex items-center text-green-600">
            <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">
              {isVerifierResponseStep ? "Verifier response observed" : "Step completed successfully!"}
            </span>
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

      {showFailure && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {failureMessage}
        </div>
      )}

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
  const { currentStep, isTestRunning } = useSelector((state: RootState) => state.test);
  const { dag } = useSelector((state: RootState) => state.dag);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [effectiveCurrentStep, setEffectiveCurrentStep] = useState(currentStep);
  const defaultTRQP =
    Boolean(process.env.NEXT_PUBLIC_TRQP_KNOWN_ENDPOINT) ||
    Boolean(process.env.NEXT_PUBLIC_TRQP_LOCAL_URL);
  const [verifyTrqp, setVerifyTrqp] = useState(defaultTRQP);

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
    const baseStepDefinitions = [
      { name: "Accept Invitation", description: "Consume the verifier's DIDComm v2 OOB invitation and connect" },
      { name: "Await Proof Request", description: "Wait for a Presentation Exchange v2 request for the Ayra Business Card" },
      { name: "Send Presentation", description: "Respond with the Ayra Business Card (Ed25519Signature2020) presentation" },
      {
        name: "Await Verifier Response",
        description:
          "Wait for an ack or problem report from the verifier.",
      },
      { name: "Evaluate Results", description: "Evaluate verifier conformance from observable evidence" },
    ];
    const trqpStepDefinitions = [
      { name: "Prepare TRQP Enforcement", description: "Resolve TRQP endpoint and verify issuer authorization" },
      { name: "Accept Invitation (Run 1)", description: "Consume verifier OOB v2 invitation using ACA-Py holder" },
      { name: "Await Proof Request (Run 1)", description: "Wait for verifier to send PE v2 proof request" },
      { name: "Send Presentation (Run 1)", description: "Reply with Ayra Business Card presentation" },
      { name: "Wait for Verification (Run 1)", description: "Wait for verifier decision" },
      { name: "Disable TRQP Authorization", description: "Remove issuer authorization before run 2" },
      { name: "Reuse Connection (Run 2)", description: "Re-use the run 1 connection for the second verification pass" },
      { name: "Await Proof Request (Run 2)", description: "Wait for verifier to send PE v2 proof request on the existing connection" },
      { name: "Send Presentation (Run 2)", description: "Reply with Ayra Business Card presentation" },
      { name: "Wait for Verification (Run 2)", description: "Wait for verifier decision after TRQP change" },
      { name: "Restore TRQP Authorization", description: "Restore trust registry authorization after run 2" },
      { name: "Evaluate TRQP Enforcement", description: "Validate verifier behavior across TRQP state changes" },
    ];
    const stepDefinitions = verifyTrqp ? trqpStepDefinitions : baseStepDefinitions;

    const mapStepDefinition = (name: string, description: string) => {
      const lower = name.toLowerCase();
      const runSuffixMatch = name.match(/\(run\s+\d+\)/i);
      const runSuffix = runSuffixMatch ? ` ${runSuffixMatch[0]}` : "";

      if (lower.includes("wait for verification")) {
        return {
          name: `Await Verifier Response${runSuffix}`,
          description:
            "Wait for an ack or problem report from the verifier.",
        };
      }
      if (lower.includes("evaluate trqp enforcement")) {
        return {
          name: "Evaluate TRQP Evidence",
          description:
            "Compare run 1 vs run 2 outcomes using observable protocol evidence and TRQP admin changes.",
        };
      }
      if (lower.includes("prepare trqp enforcement")) {
        return {
          name: "Prepare TRQP Evidence",
          description: "Resolve TRQP endpoint and verify issuer authorization via trust registry admin APIs.",
        };
      }
      return { name, description };
    };

    const dagNodes = dag?.nodes || [];
    const dagName = (dag?.metadata?.name || "").toLowerCase();
    const isVerifierDag = dagName.includes("verifier");
    const shouldUseDag = isTestRunning && currentStep > 0 && dagNodes.length > 0 && isVerifierDag;
    const resolvedStepDefinitions = shouldUseDag
      ? dagNodes.map((node) => {
          const rawName = node.task?.metadata?.name || node.name || "Step";
          const rawDescription = node.task?.metadata?.description || node.description || "";
          return mapStepDefinition(rawName, rawDescription);
        })
      : stepDefinitions;

    const activeDagNodes = shouldUseDag ? dagNodes : [];

    const waitStepIndex = resolvedStepDefinitions.findIndex((step) =>
      step.name.toLowerCase().includes("verifier response")
    );
    const waitStepNode = waitStepIndex >= 0 ? activeDagNodes[waitStepIndex] : undefined;
    const waitStepStatus = waitStepNode ? getStepStatusFromNode(waitStepNode) : null;
    const firstFailedNodeIndex = activeDagNodes.findIndex((node) => getStepStatusFromNode(node) === "failed");
    const forcedStepIndex = firstFailedNodeIndex >= 0
      ? firstFailedNodeIndex + 1
      : waitStepStatus === "failed"
        ? waitStepIndex + 1
        : null;
    const computedCurrentStep = forcedStepIndex ?? currentStep;
    setEffectiveCurrentStep(computedCurrentStep);

    const useTrqpLabels =
      verifyTrqp ||
      resolvedStepDefinitions.some((step) => {
        const lower = step.name.toLowerCase();
        return lower.includes("trqp") || lower.includes("run 2");
      });

    const buildTrqpLabel = (name: string) => {
      const runSuffixMatch = name.match(/\(run\s+\d+\)/i);
      const baseName = name.replace(/\s*\(run\s+\d+\)\s*/i, "").trim();
      const lowerBase = baseName.toLowerCase();
      let labelTop: string | undefined;

      if (runSuffixMatch?.[0]?.toLowerCase().includes("run 1")) {
        labelTop = "Run 1";
      } else if (runSuffixMatch?.[0]?.toLowerCase().includes("run 2")) {
        labelTop = "Run 2";
      } else if (lowerBase.includes("trqp")) {
        labelTop = "TRQP";
      }

      let labelBottom = baseName;
      if (lowerBase.includes("accept invitation")) {
        labelBottom = "Accept Invitation";
      } else if (lowerBase.includes("await proof request")) {
        labelBottom = "Await Request";
      } else if (lowerBase.includes("send presentation")) {
        labelBottom = "Send Presentation";
      } else if (lowerBase.includes("await verifier response")) {
        labelBottom = "Await Response";
      } else if (lowerBase.includes("prepare trqp")) {
        labelBottom = "Prepare";
      } else if (lowerBase.includes("disable trqp") && lowerBase.includes("authorization")) {
        labelBottom = "Disable Auth";
      } else if (lowerBase.includes("restore trqp") && lowerBase.includes("authorization")) {
        labelBottom = "Restore Auth";
      } else if (lowerBase.includes("evaluate trqp")) {
        labelBottom = "Evaluate";
      } else if (lowerBase.includes("reuse connection")) {
        labelBottom = "Reuse Connection";
      }

      return { labelTop, labelBottom };
    };
    type StepLabel = { labelTop?: string; labelBottom?: string };

    const initialSteps: TestStep[] = [];

    // Add the connection step (uses OOB URL input)
    const setupLabel: StepLabel = useTrqpLabels ? buildTrqpLabel("Setup Test") : {};
    initialSteps.push({
      id: 1,
      name: "Setup Test",
      description: "Process OOB URL and initialize verifier test",
      status: computedCurrentStep > 0 ? "passed" : computedCurrentStep === 0 ? "running" : "pending",
      component: (
        <VerifierConnectionStep
          isActive={computedCurrentStep === 0}
          taskData={dag?.nodes?.[0]}
          verifyTrqp={verifyTrqp}
          onVerifyTrqpChange={setVerifyTrqp}
        />
      ),
      isActive: computedCurrentStep === 0,
      taskData: dag?.nodes?.[0],
      labelTop: setupLabel.labelTop,
      labelBottom: setupLabel.labelBottom
    });

    // Add backend pipeline steps derived from the DAG
    for (let i = 0; i < resolvedStepDefinitions.length; i++) {
      const stepNum = i + 1;
      const node = activeDagNodes[i];
      const defaultStatus =
        computedCurrentStep > stepNum ? "passed" : computedCurrentStep === stepNum ? "running" : "pending";
      const status = node ? getStepStatusFromNode(node) : defaultStatus;
      const stepLabel: StepLabel = useTrqpLabels ? buildTrqpLabel(resolvedStepDefinitions[i].name) : {};
      initialSteps.push({
        id: stepNum + 1,
        name: resolvedStepDefinitions[i].name,
        description: resolvedStepDefinitions[i].description,
        status,
        component: (
            <GenericVerifierStep
            isActive={computedCurrentStep === stepNum}
            stepIndex={stepNum}
            title={resolvedStepDefinitions[i].name}
            description={resolvedStepDefinitions[i].description}
            taskData={node}
          />
        ),
        isActive: computedCurrentStep === stepNum,
        taskData: node,
        labelTop: stepLabel.labelTop,
        labelBottom: stepLabel.labelBottom
      });
    }

    // Add report step (after all 6 backend steps)
    const reportStepIndex = resolvedStepDefinitions.length + 1;
    const reportLabel: StepLabel = useTrqpLabels ? buildTrqpLabel("Report") : {};
    initialSteps.push({
      id: reportStepIndex + 1,
      name: "Report",
      description: "Review the complete test results and conformance report",
      status: computedCurrentStep === reportStepIndex ? "passed" : "pending",
      component: (
        <ReportStep
          isActive={computedCurrentStep === reportStepIndex}
          onRestart={handleRestart}
          dagData={dag}
        />
      ),
      isActive: computedCurrentStep === reportStepIndex,
      labelTop: reportLabel.labelTop,
      labelBottom: reportLabel.labelBottom
    });

    // Update step statuses based on DAG data
    if (shouldUseDag && dag?.nodes) {
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
      
      if (allNodesComplete && computedCurrentStep < reportStepIndex) {
        // Auto-advance to report step when all backend steps are done
        console.log('All verifier pipeline steps complete, showing report');
        // Note: In a real app, you might dispatch an action to advance the step
        // For now, we'll rely on the Redux middleware to handle step progression
      }
    }

    setSteps(initialSteps);
  }, [currentStep, dag, handleRestart, isTestRunning, verifyTrqp]);

  return (
    <div>
      <TestRunner
        title="Verifier Conformance Test"
        description="This test verifies if a Verifier implements the required functionality for connection, presentation request, and response handling."
        steps={steps}
        currentStep={effectiveCurrentStep}
        onRestart={handleRestart}
      />
    </div>
  );
}
