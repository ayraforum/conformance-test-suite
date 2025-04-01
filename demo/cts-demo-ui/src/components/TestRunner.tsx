import React, { useState } from "react";
import { TestStepStatus } from "@/services/TestContext";

export interface TestStep {
  id: number;
  name: string;
  description: string;
  status: TestStepStatus;
  component: React.ReactNode;
  isActive: boolean;
}

interface TestRunnerProps {
  title: string;
  description: string;
  steps: TestStep[];
  currentStep: number;
  onStepChange?: (stepIndex: number) => void;
  onRestart?: () => void;
}

export function TestRunner({
  title,
  description,
  steps,
  currentStep,
  onStepChange,
  onRestart
}: TestRunnerProps) {
  return (
    <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <p className="text-gray-700 mb-6">{description}</p>
      
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="h-1 w-full bg-gray-200 rounded"></div>
          </div>
          <div className="relative flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-500'
                }`}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex justify-between text-xs text-gray-500">
          {steps.map((step) => (
            <div key={step.id} className="w-24 text-center overflow-hidden text-ellipsis whitespace-nowrap">
              {step.name}
            </div>
          ))}
        </div>
      </div>
      
      {/* Current step info */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">{steps[currentStep]?.name}</h3>
        <p className="text-gray-600">{steps[currentStep]?.description}</p>
      </div>
      
      {/* Current step content */}
      <div className="border-t pt-4">
        {steps[currentStep]?.component}
      </div>
      
      {/* Restart button (shown only when test is finished) */}
      {onRestart && currentStep === steps.length - 1 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Start New Test
          </button>
        </div>
      )}
    </div>
  );
}
