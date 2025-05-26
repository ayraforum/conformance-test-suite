import React, { useState, useEffect } from "react";
import { TestRunner, TestStep } from "@/components/TestRunner";
import { TrustRegistryContext, createEmptyTrustRegistryContext } from "@/services/tests/TrustRegistryContext";
import { TestStepStatus } from "@/services/BaseTestContext";
import TRQPVerification from "@/components/flows/TRQPVerification";

export function TrustRegistryTest() {
  const [context, setContext] = useState<TrustRegistryContext>(createEmptyTrustRegistryContext());
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TestStep[]>([]);

  // Update context
  const updateContext = (updates: Partial<TrustRegistryContext>) => {
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
    setContext(createEmptyTrustRegistryContext());
    setCurrentStep(0);
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
        name: "Trust Registry Conformance Test",
        description: "Complete TRQP verification including registry discovery, entity resolution, credential validation, and status verification",
        status: "pending",
        component: (
          <TRQPVerification
            context={context}
            controller={{
              setStatus: (status: TestStepStatus) => updateStepStatus(0, status),
              setError: (error: string) => updateContext({ errors: { ...context.errors, didResolution: error } }),
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
      title="Trust Registry Conformance Test"
      description="This test verifies if a Trust Registry meets the TRQP conformance requirements including discovery, resolution, and validation capabilities."
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onRestart={handleRestart}
    />
  );
}
