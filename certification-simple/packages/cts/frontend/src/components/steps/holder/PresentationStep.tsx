import React, { useEffect } from "react";
import { HolderContext } from "@/services/tests/HolderContext";
import { TestStepController } from "@/services/BaseTestContext";

interface PresentationStepProps {
  context: HolderContext;
  controller: TestStepController;
  isActive: boolean;
}

export function PresentationStep({ context, controller, isActive }: PresentationStepProps) {
  useEffect(() => {
    if (isActive) {
      controller.setStatus("running");
    }
  }, [isActive, controller]);

  const handleSimulatePresentation = () => {
    // For demo purposes, simulate presentation
    controller.updateContext({
      presentationResult: {
        id: "pres-" + Math.random().toString(36).substring(2, 10),
        type: "IdentityVerification",
        attributes: {
          name: "Test User",
          dateOfBirth: "1990-01-01"
        },
        issuanceDate: new Date().toISOString()
      },
      verificationStatus: "verified"
    });
    controller.setStatus("passed");
    controller.complete(true);
    controller.goToNextStep();
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="bg-gray-100 p-4 rounded-lg w-full max-w-md mb-4">
        <h3 className="font-semibold mb-2">Presentation Status:</h3>
        <p className="text-sm">
          Waiting for presentation request...
        </p>
      </div>

      <button
        onClick={handleSimulatePresentation}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        Simulate Presentation (Demo)
      </button>
    </div>
  );
}
