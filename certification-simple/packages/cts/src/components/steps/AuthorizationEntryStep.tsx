import React, { useState, useEffect } from "react";
import { TestContext, TestStepController } from "@/services/TestContext";

interface AuthorizationEntryStepProps {
    context: TestContext;
    controller: TestStepController;
    isActive: boolean;
}

export function AuthorizationEntryStep({ context, controller, isActive }: AuthorizationEntryStepProps) {
    const [entityId, setEntityId] = useState(context.entityId || "");
    const [authorizationId, setAuthorizationId] = useState(context.authorizationId || "");
    
    // Update input fields when context changes
    useEffect(() => {
        setEntityId(context.entityId || "");
        setAuthorizationId(context.authorizationId || "");
    }, [context.entityId, context.authorizationId]);
    
    // Mark step as waiting when active
    useEffect(() => {
        if (isActive) {
            controller.setStatus("waiting");
        }
    }, [isActive, controller]);
    
    const handleEntityIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEntityId(e.target.value);
    };
    
    const handleAuthorizationIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAuthorizationId(e.target.value);
    };
    
    const handleSubmit = () => {
        if (!entityId?.trim() || !authorizationId?.trim()) {
            controller.setError("Please provide both Entity ID and Authorization ID");
            return;
        }
        
        controller.setError(null);
        controller.updateContext({ entityId, authorizationId });
        controller.setStatus("passed");
        controller.complete(true);
        controller.goToNextStep();
    };
    
    return (
        <div className="flex flex-col p-4 border border-gray-300 rounded">
            <p className="mb-4 text-sm text-gray-600">
                Enter the Entity ID and Authorization ID to verify if the entity is authorized for the specified action.
                This should be an entity that has already been registered in the Trust Registry.
            </p>
            
            <div className="mb-4">
                <label htmlFor="entityId" className="block text-sm font-medium text-gray-700 mb-1">
                    Entity ID:
                </label>
                <input
                    id="entityId"
                    type="text"
                    value={entityId}
                    onChange={handleEntityIdChange}
                    placeholder="did:example:entity123"
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                    The DID or identifier of the entity to be verified.
                </p>
            </div>
            
            <div className="mb-4">
                <label htmlFor="authorizationId" className="block text-sm font-medium text-gray-700 mb-1">
                    Authorization ID:
                </label>
                <input
                    id="authorizationId"
                    type="text"
                    value={authorizationId}
                    onChange={handleAuthorizationIdChange}
                    placeholder="did:example:authz"
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                    The specific authorization to check (e.g., "issue-credentials", "verify-credentials").
                </p>
            </div>
            
            <button
                onClick={handleSubmit}
                disabled={!entityId || !authorizationId}
                className={`px-4 py-2 rounded text-white font-medium w-full mt-4 text-center ${
                    !entityId || !authorizationId
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
                }`}
            >
                Continue to Verification
            </button>
        </div>
    );
}
