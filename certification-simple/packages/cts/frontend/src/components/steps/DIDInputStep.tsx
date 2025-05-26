import React, { useState, useEffect } from "react";
import { TestContext, TestStepController } from "@/services/BaseTestContext";
import { TestService } from "@/services/TestService";

interface DIDInputStepProps {
    context: TestContext;
    controller: TestStepController;
    isActive: boolean;
}

export function DIDInputStep({ context, controller, isActive }: DIDInputStepProps) {
    const [ecosystemDID, setEcosystemDID] = useState(context.ecosystemDID || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Update input field when context changes
    useEffect(() => {
        setEcosystemDID(context.ecosystemDID || "");
    }, [context.ecosystemDID]);
    
    // Mark step as waiting when active
    useEffect(() => {
        if (isActive) {
            controller.setStatus("waiting");
        }
    }, [isActive, controller]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEcosystemDID(e.target.value);
    };
    
    const handleSubmit = async () => {
        if (!ecosystemDID?.trim()) {
            controller.setError("Please enter an Ecosystem DID");
            return;
        }
        
        setIsSubmitting(true);
        controller.setStatus("running");
        
        try {
            // Update the TRQP test pipeline with the DID
            await TestService.setTrqpDid(ecosystemDID);
            
            controller.setStatus("complete");
            controller.setError(null);
            controller.updateContext({ ecosystemDID });
            controller.complete(true);
            controller.goToNextStep();
        } catch (error) {
            console.error("Error setting DID:", error);
            controller.setError("Failed to set the DID. Please try again.");
            controller.setStatus("failed");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="flex flex-col p-4 border border-gray-300 rounded">
            <p className="mb-4 text-sm text-gray-600">
                Enter the Decentralized Identifier (DID) for the ecosystem you want to test.
            </p>
            
            <div className="mb-4">
                <label htmlFor="ecosystemDID" className="block text-sm font-medium text-gray-700 mb-1">
                    Ecosystem DID:
                </label>
                <input
                    id="ecosystemDID"
                    type="text"
                    value={ecosystemDID}
                    onChange={handleChange}
                    placeholder="did:example:ecosystem"
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-500">
                    The DID of the ecosystem trust registry to test for conformance.
                </p>
            </div>
            
            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-4 py-2 ${isSubmitting ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded w-full mt-2`}
            >
                {isSubmitting ? 'Submitting...' : 'Continue'}
            </button>
        </div>
    );
}
