import React, { useState, useEffect } from "react";
import { TestRunner, TestStep } from "@/components/TestRunner";
import { HolderContext, createEmptyHolderContext } from "@/services/tests/HolderContext";
import { TestStepStatus, TestStepController } from "@/services/BaseTestContext";
import { HolderTestPipeline } from "@/lib/pipelines/holderTestPipeline";
import HolderVerification from "@/components/flows/HolderVerification";

export function HolderTest() {
  const [context, setContext] = useState<HolderContext>(createEmptyHolderContext());
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [pipeline, setPipeline] = useState<HolderTestPipeline | null>(null);

  // Initialize pipeline when agent is available
  useEffect(() => {
    if (context.agent && !pipeline) {
      const newPipeline = new HolderTestPipeline(context.agent);
      setPipeline(newPipeline);
    }
  }, [context.agent, pipeline]);

  // Update context
  const updateContext = (updates: Partial<HolderContext>) => {
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
    setContext(createEmptyHolderContext());
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
        name: "Holder Conformance Test",
        description: "Complete holder verification flow including connection, credential request, issuance, and presentation",
        status: "pending",
        component: (
          <HolderVerification
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
      title="Holder Conformance Test"
      description="This test verifies if a Holder implements the required functionality for connection, credential request, issuance, and presentation."
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onRestart={handleRestart}
    />
  );
}
