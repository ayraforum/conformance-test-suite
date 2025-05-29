import React, { useEffect, useState } from "react";
import { TestContext, TestStepController } from "@/services/TestContext";
import { verifyEntityAuthorization } from "@/services/trustRegistryApi";

interface AuthorizationVerificationStepProps {
    context: TestContext;
    controller: TestStepController;
    isActive: boolean;
}

export function AuthorizationVerificationStep({ context, controller, isActive }: AuthorizationVerificationStepProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    // Automatically start verification when this step becomes active
    useEffect(() => {
        if (isActive && context.apiBaseUrl && context.entityId && context.authorizationId) {
            verifyAuthorization();
        }
    }, [isActive, context.apiBaseUrl, context.entityId, context.authorizationId]);
    
    const verifyAuthorization = async () => {
        if (!context.apiBaseUrl) {
            controller.setError("No API base URL available. Please resolve a DID with a TRQP service endpoint first.");
            controller.setStatus("failed");
            return;
        }
        
        if (!context.entityId || !context.authorizationId) {
            controller.setError("Entity ID and Authorization ID are required.");
            controller.setStatus("failed");
            return;
        }
        
        if (!context.ecosystemDID) {
            controller.setError("Ecosystem DID is required.");
            controller.setStatus("failed");
            return;
        }
        
        setIsLoading(true);
        controller.setStatus("running");
        controller.setError(null);
        
        try {
            if (!context.apiBaseUrl) {
                throw new Error("API base URL is not available");
            }
            
            console.log("Using API base URL for verification:", context.apiBaseUrl);
            const result = await verifyEntityAuthorization(
                context.apiBaseUrl,
                context.entityId,
                context.authorizationId,
                context.ecosystemDID,
                "" // No bearer token for now
            );
            
            // Update context with verification result
            controller.updateContext({
                authResult: result,
                reportTimestamp: new Date().toISOString()
            });
            
            controller.setStatus(result.authorized ? "passed" : "failed");
            controller.complete(true); // Always complete, even if not authorized
            
            // Generate report
            setTimeout(() => controller.goToNextStep(), 1000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            controller.setError(errorMessage);
            controller.setStatus("failed");
            controller.updateContext({
                errors: {
                    ...context.errors,
                    authVerification: errorMessage
                }
            });
            controller.complete(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col p-4 border border-gray-300 rounded">
            {isLoading ? (
                <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                    <span className="text-gray-600">Verifying authorization...</span>
                </div>
            ) : context.authResult ? (
                <div className="w-full">
                    <div className="mb-4 flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            context.authResult.authorized ? 'bg-green-500' : 'bg-red-500'
                        } text-white mr-3`}>
                            {context.authResult.authorized ? '✓' : '✗'}
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${
                                context.authResult.authorized ? 'text-green-700' : 'text-red-700'
                            }`}>
                                {context.authResult.authorized ? 'Authorized' : 'Not Authorized'}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {context.authResult.authorized 
                                    ? 'The entity is authorized for the specified action.'
                                    : 'The entity is not authorized for the specified action.'}
                            </p>
                        </div>
                    </div>
                    
                    {context.authResult.details && (
                        <div className="mt-4">
                            <p className="font-medium mb-2">Response Details:</p>
                            <div className="bg-gray-100 p-3 rounded overflow-auto max-h-60">
                                <pre className="text-xs">
                                    {JSON.stringify(context.authResult.details, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => controller.goToNextStep()}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            View Final Report
                        </button>
                    </div>
                </div>
            ) : context.errors?.authVerification ? (
                <div className="text-center py-4 text-red-500">
                    <p className="font-semibold">Error:</p>
                    <p>{context.errors.authVerification}</p>
                    
                    <button
                        onClick={verifyAuthorization}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Try Again
                    </button>
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-gray-600">
                        Ready to verify if entity <strong>{context.entityId}</strong> is authorized 
                        for <strong>{context.authorizationId}</strong>.
                    </p>
                    
                    <button
                        onClick={verifyAuthorization}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Verify Authorization
                    </button>
                </div>
            )}
        </div>
    );
}
