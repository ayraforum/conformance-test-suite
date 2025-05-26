import React, { useState, useEffect } from "react";
import { TestRunner, TestStep } from "@/components/TestRunner";
import { VerifierContext, createEmptyVerifierContext } from "@/services/tests/VerifierContext";
import { TestStepStatus, TestStepController } from "@/services/BaseTestContext";
import { VerifierTestPipeline } from "@/lib/pipelines/verifierTestPipeline";
import VerifierVerification from "@/components/flows/VerifierVerification";

export function VerifierTest() {
  const [context, setContext] = useState<VerifierContext>(createEmptyVerifierContext());
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [pipeline, setPipeline] = useState<VerifierTestPipeline | null>(null);

  // Initialize pipeline when agent is available
  useEffect(() => {
    if (context.agent && !pipeline) {
      const newPipeline = new VerifierTestPipeline(context.agent);
      setPipeline(newPipeline);
    }
  }, [context.agent, pipeline]);

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
  const updateStepStatus = (stepIndex: number, status: TestStepStatus) => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps];
      if (newSteps[stepIndex]) {
        newSteps[stepIndex] = {
          ...newSteps[stepIndex],
          status
        };
      }
      return newSteps;
    });
  };
  
  // Reset and restart
  const handleRestart = () => {
    setContext(createEmptyVerifierContext());
    setCurrentStep(0);
    setPipeline(null);
    setSteps(prevSteps => 
      prevSteps.map(step => ({
        ...step,
        status: "pending",
        isActive: step.id === 1
      }))
    );
  };
  
  // Initialize steps - now delegating to flow
  useEffect(() => {
    const initialSteps: TestStep[] = [
      {
        id: 1,
        name: "Verifier Conformance Test",
        description: "Complete verifier verification flow including connection, presentation request, verification, and trust registry validation",
        status: "pending",
        component: (
          <VerifierVerification
            context={context}
            controller={{
              setStatus: (status: TestStepStatus) => updateStepStatus(0, status),
              setError: (error: string) => updateContext({ errors: { ...context.errors, connection: error } }),
              complete: (success: boolean) => {},
              updateContext: updateContext,
              goToNextStep: () => setCurrentStep(1)
            }}
            isActive={currentStep === 0}
          />
        ),
        isActive: currentStep === 0
      }
    ];
    
    setSteps(initialSteps);
  }, [currentStep, context]);

  return (
    <TestRunner
      title="Verifier Conformance Test"
      description="This test verifies if a Verifier implements the required functionality for connection, presentation request, verification, and trust registry validation."
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onRestart={handleRestart}
    />
  );
}
