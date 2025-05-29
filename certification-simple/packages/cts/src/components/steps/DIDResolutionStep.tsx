import React, { useEffect, useState } from "react";
import { TestContext, TestStepController } from "@/services/TestContext";
import { resolveDID as resolveDIDService, getServiceEndpoint } from "@/services/didResolver";

interface DIDResolutionStepProps {
    context: TestContext;
    controller: TestStepController;
    isActive: boolean;
}

export function DIDResolutionStep({ context, controller, isActive }: DIDResolutionStepProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    // Automatically start resolving when this step becomes active
    useEffect(() => {
        if (isActive && context.ecosystemDID) {
            resolveDID();
        }
    }, [isActive, context.ecosystemDID]);
    
    const resolveDID = async () => {
        if (!context.ecosystemDID) {
            controller.setError("No Ecosystem DID provided");
            controller.setStatus("failed");
            return;
        }
        
        setIsLoading(true);
        controller.setStatus("running");
        controller.setError(null);
        
        try {
            const document = await resolveDIDService(context.ecosystemDID);
            
            if (!document) {
                throw new Error("Failed to resolve DID");
            }
            
            console.log("Resolved DID document:", document);
            
            // Check for TRQP service
            const hasTrqpService = document.service?.some(svc => svc.type === "TRQP") || false;
            if (!hasTrqpService) {
                throw new Error("DID document does not contain a TRQP service endpoint");
            }
            
            // Log all services for debugging
            if (document.service) {
                console.log("Services found:", document.service.map(svc => ({
                    type: svc.type,
                    endpoint: svc.serviceEndpoint
                })));
            }
            
            // Get the TRQP service endpoint
            const apiBaseUrl = getServiceEndpoint(document, "TRQP");
            
            if (!apiBaseUrl) {
                throw new Error("Could not extract TRQP service endpoint");
            }
            
            console.log("Found TRQP service endpoint:", apiBaseUrl);
            
            // Update context with resolved document and API URL
            controller.updateContext({
                didDocument: document,
                apiBaseUrl
            });
            
            // For testing: Allow overriding the API URL with a local server
            const useLocalServer = true; // Set to false in production
            if (useLocalServer) {
                const localApiUrl = "http://localhost:8082/api/v2/";
                console.log(`Overriding API URL with local server: ${localApiUrl}`);
                controller.updateContext({
                    apiBaseUrl: localApiUrl
                });
            }
            
            controller.setStatus("passed");
            controller.complete(true);
            
            // Proceed to next step
            setTimeout(() => controller.goToNextStep(), 1000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            controller.setError(errorMessage);
            controller.setStatus("failed");
            controller.updateContext({
                errors: {
                    ...context.errors,
                    didResolution: errorMessage
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
                    <span className="text-gray-600">Resolving {context.ecosystemDID}...</span>
                </div>
            ) : context.didDocument ? (
                <div className="w-full">
                    <div className="flex items-center mb-4">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500 text-white mr-2">
                            ✓
                        </div>
                        <span className="font-semibold">TRQP Service Found</span>
                    </div>
                    
                    <div className="mt-4">
                        <p className="font-medium mb-2">DID Document:</p>
                        <div className="bg-gray-100 p-3 rounded overflow-auto max-h-60">
                            <pre className="text-xs">
                                {JSON.stringify(context.didDocument, null, 2)}
                            </pre>
                        </div>
                    </div>
                    
                    {context.didDocument.service && (
                        <div className="mt-4">
                            <p className="font-medium mb-2">Services:</p>
                            <ul className="space-y-2">
                                {context.didDocument.service.map((svc, idx) => (
                                    <li key={idx} className="bg-gray-100 p-2 rounded">
                                        <p><strong>Type:</strong> {svc.type}</p>
                                        <p><strong>Endpoint:</strong> {svc.serviceEndpoint?.uri || "N/A"}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div className="mt-4 text-sm text-gray-600">
                        <p>DID successfully resolved with TRQP service endpoint.</p>
                        <p>API endpoint: {context.apiBaseUrl}</p>
                    </div>
                </div>
            ) : context.errors?.didResolution ? (
                <div className="text-center py-4 text-red-500">
                    <p className="font-semibold">Error:</p>
                    <p>{context.errors.didResolution}</p>
                    
                    <button
                        onClick={resolveDID}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Try Again
                    </button>
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-gray-500 italic">
                        Ready to resolve DID: {context.ecosystemDID}
                    </p>
                    
                    <button
                        onClick={resolveDID}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Resolve Now
                    </button>
                </div>
            )}
        </div>
    );
}
