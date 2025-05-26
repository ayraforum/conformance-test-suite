import React from "react";
import { HolderContext } from "@/services/tests/HolderContext";
import { TestStepController } from "@/services/BaseTestContext";

interface HolderReportStepProps {
  context: HolderContext;
  controller: TestStepController;
  isActive: boolean;
  onRestart: () => void;
}

export function HolderReportStep({ context, controller, isActive, onRestart }: HolderReportStepProps) {
  return (
    <div className="flex flex-col items-center p-4">
      <div className="bg-gray-100 p-4 rounded-lg w-full max-w-md mb-4">
        <h3 className="font-semibold mb-2">Test Results:</h3>
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Connection:</span>{" "}
            {context.connection ? "✓ Established" : "✗ Failed"}
          </p>
          <p>
            <span className="font-medium">Presentation:</span>{" "}
            {context.presentationResult ? "✓ Completed" : "✗ Failed"}
          </p>
          <p>
            <span className="font-medium">Verification:</span>{" "}
            {context.verificationStatus === "verified" ? "✓ Verified" : "✗ Failed"}
          </p>
        </div>
      </div>

      {context.presentationResult && (
        <div className="bg-gray-100 p-4 rounded-lg w-full max-w-md mb-4">
          <h3 className="font-semibold mb-2">Presentation Details:</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">ID:</span> {context.presentationResult.id}
            </p>
            <p>
              <span className="font-medium">Type:</span> {context.presentationResult.type}
            </p>
            <p>
              <span className="font-medium">Issuance Date:</span>{" "}
              {new Date(context.presentationResult.issuanceDate).toLocaleString()}
            </p>
            <div>
              <span className="font-medium">Attributes:</span>
              <ul className="list-disc list-inside ml-2">
                {Object.entries(context.presentationResult.attributes).map(([key, value]) => (
                  <li key={key}>
                    {key}: {String(value)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onRestart}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        Start New Test
      </button>
    </div>
  );
}
