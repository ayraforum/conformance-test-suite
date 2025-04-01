import React, { useState, useEffect } from "react";
import { TestRunner, TestStep } from "@/components/TestRunner";
import { HolderContext, createEmptyHolderContext } from "@/services/tests/HolderContext";
import { TestStepStatus } from "@/services/BaseTestContext";

// Import step components
import { ConnectionStep } from "@/components/steps/holder/ConnectionStep";
import { CredentialIssuanceStep } from "@/components/steps/holder/CredentialIssuanceStep";
import { PresentationStep } from "@/components/steps/holder/PresentationStep";
import { HolderReportStep } from "@/components/steps/holder/HolderReportStep";

export function HolderTest() {
  const [context, setContext] = useState<HolderContext>(createEmptyHolderContext());
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TestStep[]>([]);

  // Update steps' isActive property when currentStep changes
  useEffect(() => {
    setSteps(prevSteps => 
      prevSteps.map((step, index) => ({
        ...step,
        isActive: index === currentStep
      }))
    );
  }, [currentStep]);
  
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
    setSteps(prevSteps => 
      prevSteps.map(step => ({
        ...step,
        status: "pending",
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
        status: "pending",
        component: (
          <ConnectionStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(0, status),
              setError: (error) => updateContext({ errors: { ...context.errors, connection: error } }),
              complete: (success) => {},
              updateContext: updateContext,
              goToNextStep: () => setCurrentStep(1)
            }}
            isActive={currentStep === 0}
          />
        ),
        isActive: currentStep === 0
      },
      {
        id: 2,
        name: "Credential Issuance",
        description: "Issue a test credential to the wallet",
        status: "pending",
        component: (
          <CredentialIssuanceStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(1, status),
              setError: (error) => updateContext({ errors: { ...context.errors, credential: error } }),
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
        name: "Presentation",
        description: "Request and verify a presentation of the credential",
        status: "pending",
        component: (
          <PresentationStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(2, status),
              setError: (error) => updateContext({ errors: { ...context.errors, presentation: error } }),
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
        name: "Report",
        description: "Review the test results",
        status: "pending",
        component: (
          <HolderReportStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(3, status),
              setError: () => {},
              complete: (success) => {},
              updateContext: updateContext,
              goToNextStep: () => {}
            }}
            isActive={currentStep === 3}
            onRestart={handleRestart}
          />
        ),
        isActive: currentStep === 3
      }
    ];
    
    setSteps(initialSteps);
  }, [currentStep, context]);

  return (
    <TestRunner
      title="Holder Wallet Conformance Test"
      description="This test verifies if a Holder Wallet implements the required functionality for connection, credential reception, and presentation."
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onRestart={handleRestart}
    />
  );
}
