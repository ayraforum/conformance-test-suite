import React, { useState, useEffect } from "react";
import { TestContext, TestStepController } from "@/services/TestContext";

interface DIDInputStepProps {
    context: TestContext;
    controller: TestStepController;
    isActive: boolean;
}

export function DIDInputStep({ context, controller, isActive }: DIDInputStepProps) {
    const [ecosystemDID, setEcosystemDID] = useState(context.ecosystemDID || "");
    
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
    
    const handleSubmit = () => {
        if (!ecosystemDID?.trim()) {
            controller.setError("Please enter an Ecosystem DID");
            return;
        }
        
        controller.setError(null);
        controller.updateContext({ ecosystemDID });
        controller.complete(true);
        controller.goToNextStep();
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
                />
                <p className="mt-1 text-xs text-gray-500">
                    The DID of the ecosystem trust registry to test for conformance.
                </p>
            </div>
            
            <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full mt-2"
            >
                Continue
            </button>
        </div>
    );
}
