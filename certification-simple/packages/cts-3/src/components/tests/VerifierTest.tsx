import React, { useState, useEffect } from "react";
import { TestRunner, TestStep } from "@/components/TestRunner";
import type { TestStepStatus as RunnerTestStepStatus } from "@/components/TestRunner";
import { VerifierContext, createEmptyVerifierContext } from "@/services/tests/VerifierContext";
import { useSocket } from "@/providers/SocketProvider";
import { TestStepController, TestStepStatus as BaseTestStepStatus } from "@/services/BaseTestContext";

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

// Import step components
import { VerifierConnectionStep } from "@/components/steps/verifier/VerifierConnectionStep";
import { PresentationRequestStep } from "@/components/steps/verifier/PresentationRequestStep";
import { VerificationStep } from "@/components/steps/verifier/VerificationStep";
import { VerifierReportStep } from "@/components/steps/verifier/VerifierReportStep";

export function VerifierTest() {
  const { socket, isConnected } = useSocket();
  const [context, setContext] = useState<VerifierContext>(createEmptyVerifierContext());
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [dagData, setDagData] = useState<DAGData | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('invitation', (url: string) => {
      console.log('Received invitation:', url);
      setInvitationUrl(url);
      setMessages(prev => [...prev, 'Received connection invitation']);
      updateStepStatus(0, "running" as BaseTestStepStatus);
    });

    socket.on('dag-update', (data: { dag: DAGData }) => {
      console.log('DAG Update received:', JSON.stringify(data.dag, null, 2));
      if (data.dag) {
        setDagData(data.dag);
        updateStepsFromDAG(data.dag);
      }
    });

    // Add debug logging for socket events
    socket.on('connect', () => {
      console.log('Socket connected');
      setMessages(prev => [...prev, 'Socket connected']);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setMessages(prev => [...prev, 'Socket disconnected']);
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      setMessages(prev => [...prev, `Socket error: ${error.message || 'Unknown error'}`]);
    });

    return () => {
      socket.off('invitation');
      socket.off('dag-update');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
    };
  }, [socket]);

  // Convert DAG node status to test step status
  const getStepStatusFromNode = (node: TaskNode): BaseTestStepStatus => {
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
      newCurrentStep = 4;
    } else if (lastCompletedNode !== -1) {
      // Move to next step after completed one
      newCurrentStep = Math.min(lastCompletedNode + 1, 4);
    }

    if (newCurrentStep !== currentStep) {
      setCurrentStep(newCurrentStep);
    }
  };

  // Start the verifier test
  const startVerifierTest = async () => {
    if (!socket || !isConnected) {
      console.error('Not connected to server. Please refresh and try again.');
      setMessages(prev => [...prev, 'Error: Not connected to server. Please refresh and try again.']);
      return;
    }

    setHasStarted(true);
    setMessages(['Starting verifier test...']);
    
    try {
      // Select the verifier pipeline first
      const pipelineResponse = await fetch('http://localhost:5005/api/select/pipeline?pipeline=VERIFIER_TEST');
      if (!pipelineResponse.ok) {
        throw new Error(`Failed to select pipeline: ${pipelineResponse.statusText}`);
      }
      console.log('Verifier pipeline selected');
      setMessages(prev => [...prev, 'Verifier pipeline selected']);
      
      // Small delay to ensure pipeline is selected
      setTimeout(async () => {
        // Start the pipeline execution
        const runResponse = await fetch('http://localhost:5005/api/run');
        if (!runResponse.ok) {
          throw new Error(`Failed to start pipeline: ${runResponse.statusText}`);
        }
        console.log('Pipeline started');
        setMessages(prev => [...prev, 'Pipeline started']);
      }, 500);
    } catch (error) {
      console.error('Error starting verifier test:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start test. Please try again.';
      setMessages(prev => [...prev, `Error: ${errorMessage}`]);
      setHasStarted(false);
    }
  };

  // Update context
  const updateContext = (updates: Partial<VerifierContext>) => {
    setContext(prevContext => ({
      ...prevContext,
      ...updates,
      errors: {
        ...prevContext.errors,
        ...(updates.errors || {})
      }
    }));
  };
  
  // Update step status
  const updateStepStatus = (stepIndex: number, status: BaseTestStepStatus) => {
    // Convert BaseTestStepStatus to RunnerTestStepStatus
    const runnerStatus: RunnerTestStepStatus = 
      status === "waiting" ? "running" :
      status === "pending" ? "pending" :
      status === "running" ? "running" :
      status === "passed" ? "passed" :
      "failed";

    setSteps(prevSteps => {
      const newSteps = [...prevSteps];
      if (newSteps[stepIndex]) {
        newSteps[stepIndex] = {
          ...newSteps[stepIndex],
          status: runnerStatus
        };
      }
      return newSteps;
    });
  };
  
  // Reset and restart
  const handleRestart = () => {
    setContext(createEmptyVerifierContext());
    setCurrentStep(0);
    setDagData(null);
    setMessages([]);
    setHasStarted(false);
    setInvitationUrl(null);
    setSteps(prevSteps => 
      prevSteps.map(step => ({
        ...step,
        status: "pending" as BaseTestStepStatus,
        isActive: step.id === 1
      }))
    );
  };
  
  // Initialize steps
  useEffect(() => {
    const initialSteps: TestStep[] = [
      {
        id: 1,
        name: "Connection",
        description: "Establish connection with the holder wallet",
        status: currentStep > 0 ? "passed" : currentStep === 0 ? "running" : "pending",
        component: (
          <VerifierConnectionStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(0, status),
              setError: (error) => updateContext({ errors: { ...context.errors, connection: error } }),
              complete: (success) => {},
              updateContext: updateContext,
              goToNextStep: () => setCurrentStep(1)
            }}
            isActive={currentStep === 0}
            invitationUrl={invitationUrl}
            messages={messages}
            hasStarted={hasStarted}
            onStart={startVerifierTest}
          />
        ),
        isActive: currentStep === 0
      },
      {
        id: 2,
        name: "User Requests Proof",
        description: "Send a presentation request to the holder wallet",
        status: currentStep > 1 ? "passed" : currentStep === 1 ? "running" : "pending",
        component: (
          <PresentationRequestStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(1, status),
              setError: (error) => updateContext({ errors: { ...context.errors, request: error } }),
              complete: (success) => {},
              updateContext: updateContext,
              goToNextStep: () => setCurrentStep(2)
            }}
            isActive={currentStep === 1}
          />
        ),
        isActive: currentStep === 1
      },
      {
        id: 3,
        name: "Ayra Present Proof",
        description: "Wait for the holder to present their proof",
        status: currentStep > 2 ? "passed" : currentStep === 2 ? "running" : "pending",
        component: (
          <VerificationStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(2, status),
              setError: (error) => updateContext({ errors: { ...context.errors, verification: error } }),
              complete: (success) => {},
              updateContext: updateContext,
              goToNextStep: () => setCurrentStep(3)
            }}
            isActive={currentStep === 2}
          />
        ),
        isActive: currentStep === 2
      },
      {
        id: 4,
        name: "Verify Response",
        description: "Verify the presented proof",
        status: currentStep > 3 ? "passed" : currentStep === 3 ? "running" : "pending",
        component: (
          <VerificationStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(3, status),
              setError: (error) => updateContext({ errors: { ...context.errors, verification: error } }),
              complete: (success) => {},
              updateContext: updateContext,
              goToNextStep: () => setCurrentStep(4)
            }}
            isActive={currentStep === 3}
          />
        ),
        isActive: currentStep === 3
      },
      {
        id: 5,
        name: "Report",
        description: "Review the test results",
        status: currentStep === 4 ? "passed" : "pending",
        component: (
          <VerifierReportStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(4, status),
              setError: () => {},
              complete: (success) => {},
              updateContext: updateContext,
              goToNextStep: () => {}
            }}
            isActive={currentStep === 4}
            onRestart={handleRestart}
          />
        ),
        isActive: currentStep === 4
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
  }, [currentStep, context, dagData, hasStarted, isConnected, invitationUrl, messages]);

  return (
    <div>
      <TestRunner
        title="Verifier Conformance Test"
        description="This test verifies if a Verifier implements the required functionality for connection, presentation request, and verification."
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onRestart={handleRestart}
      />
    </div>
  );
}
