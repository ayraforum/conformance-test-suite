import React, { useState, useEffect } from "react";
import { TestRunner, TestStep } from "@/components/TestRunner";
import { TrustRegistryContext, createEmptyTrustRegistryContext } from "@/services/tests/TrustRegistryContext";
import { TestStepStatus } from "@/services/BaseTestContext";

// Import step components
import { DIDInputStep } from "@/components/steps/DIDInputStep";
import { DIDResolutionStep } from "@/components/steps/DIDResolutionStep";
import { ApiConformanceStep } from "@/components/steps/ApiConformanceStep";
import { AuthorizationEntryStep } from "@/components/steps/AuthorizationEntryStep";
import { AuthorizationVerificationStep } from "@/components/steps/AuthorizationVerificationStep";
import { ReportStep } from "@/components/steps/ReportStep";

export function TrustRegistryTest() {
  const [context, setContext] = useState<TrustRegistryContext>(createEmptyTrustRegistryContext());
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
  
  // Initialize steps
  useEffect(() => {
    const initialSteps: TestStep[] = [
      {
        id: 1,
        name: "Enter Ecosystem DID",
        description: "Provide the Ecosystem DID to be tested",
        status: "pending",
        component: (
          <DIDInputStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(0, status),
              setError: (error) => updateContext({ errors: { ...context.errors, didResolution: error } }),
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
        name: "Resolve DID",
        description: "Resolve the DID and find TRQP service endpoints",
        status: "pending",
        component: (
          <DIDResolutionStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(1, status),
              setError: (error) => updateContext({ errors: { ...context.errors, didResolution: error } }),
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
        name: "API Conformance",
        description: "Test the API against the conformance requirements",
        status: "pending",
        component: (
          <ApiConformanceStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(2, status),
              setError: (error) => updateContext({ errors: { ...context.errors, apiTest: error } }),
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
        name: "Authorization Entry",
        description: "Enter entity and authorization details for verification",
        status: "pending",
        component: (
          <AuthorizationEntryStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(3, status),
              setError: (error) => updateContext({ errors: { ...context.errors, authVerification: error } }),
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
        name: "Verification",
        description: "Verify if the entity is authorized for the specified action",
        status: "pending",
        component: (
          <AuthorizationVerificationStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(4, status),
              setError: (error) => updateContext({ errors: { ...context.errors, authVerification: error } }),
              complete: (success) => {},
              updateContext: updateContext,
              goToNextStep: () => setCurrentStep(5)
            }}
            isActive={currentStep === 4}
          />
        ),
        isActive: currentStep === 4
      },
      {
        id: 6,
        name: "Report",
        description: "Review the test results",
        status: "pending",
        component: (
          <ReportStep
            context={context}
            controller={{
              setStatus: (status) => updateStepStatus(5, status),
              setError: () => {},
              complete: (success) => {},
              updateContext: updateContext,
              goToNextStep: () => {}
            }}
            isActive={currentStep === 5}
            onRestart={handleRestart}
          />
        ),
        isActive: currentStep === 5
      }
    ];
    
    setSteps(initialSteps);
  }, [currentStep, context]);

  return (
    <TestRunner
      title="Trust Registry Conformance Test"
      description="This test verifies if a Trust Registry meets the TRQP conformance requirements."
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onRestart={handleRestart}
    />
  );
}
