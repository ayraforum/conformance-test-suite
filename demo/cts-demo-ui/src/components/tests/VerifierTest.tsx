import React, { useState, useEffect } from "react";
import { TestRunner, TestStep } from "@/components/TestRunner";
import { VerifierContext, createEmptyVerifierContext } from "@/services/tests/VerifierContext";
import { TestStepStatus } from "@/services/BaseTestContext";

// Import step components
import { VerifierConnectionStep } from "@/components/steps/verifier/VerifierConnectionStep";
import { PresentationRequestStep } from "@/components/steps/verifier/PresentationRequestStep";
import { VerificationStep } from "@/components/steps/verifier/VerificationStep";
import { VerifierReportStep } from "@/components/steps/verifier/VerifierReportStep";

export function VerifierTest() {
  const [context, setContext] = useState<VerifierContext>(createEmptyVerifierContext());
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
          />
        ),
        isActive: currentStep === 0
      },
      {
        id: 2,
        name: "Request Presentation",
        description: "Send a presentation request to the wallet",
        status: "pending",
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
        name: "Verification",
        description: "Verify the presentation from the holder",
        status: "pending",
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
        name: "Report",
        description: "Review the test results",
        status: "pending",
        component: (
          <VerifierReportStep
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
      title="Verifier Conformance Test"
      description="This test verifies if a Verifier implements the required functionality for connection, presentation request, and verification."
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onRestart={handleRestart}
    />
  );
}
