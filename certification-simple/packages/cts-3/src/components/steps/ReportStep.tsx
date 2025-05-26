import React from "react";
import { TestContext, TestStepController } from "@/services/TestContext";

interface ReportStepProps {
    context: TestContext;
    controller: TestStepController;
    isActive: boolean;
    onRestart: () => void;
}

export function ReportStep({ context, controller, isActive, onRestart }: ReportStepProps) {
    // Mark step as passed when active
    React.useEffect(() => {
        if (isActive) {
            controller.setStatus("passed");
            controller.complete(true);
        }
    }, [isActive, controller]);
    
    // Determine overall status
    const getOverallStatus = () => {
        if (!context.didDocument) return "Failed";
        if (!context.apiTestReport) return "Incomplete";
        if (!context.authResult) return "Incomplete";
        
        const hasTrqpService = context.didDocument.service?.some(svc => svc.type === "TRQP") || false;
        const apiTestsPassed = context.apiTestReport.failedCount === 0;
        const isAuthorized = context.authResult.authorized || false;
        
        if (!hasTrqpService) return "Failed";
        if (!apiTestsPassed) return "Partial";
        
        return isAuthorized ? "Passed" : "Failed";
    };
    
    // Get status color
    const getStatusColor = () => {
        const status = getOverallStatus();
        switch (status) {
            case "Passed":
                return "bg-green-100 text-green-800";
            case "Partial":
                return "bg-yellow-100 text-yellow-800";
            case "Incomplete":
                return "bg-blue-100 text-blue-800";
            case "Failed":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };
    
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Trust Registry Conformance Report</h2>
                <div className={`px-3 py-1 rounded-full ${getStatusColor()}`}>
                    {getOverallStatus()}
                </div>
            </div>
            
            <div className="mb-6">
                <p className="text-sm text-gray-500">
                    Generated on: {new Date(context.reportTimestamp || Date.now()).toLocaleString()}
                </p>
                <p className="font-medium">
                    Ecosystem DID: <span className="font-normal">{context.ecosystemDID}</span>
                </p>
            </div>
            
            <div className="space-y-6">
                <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-semibold">DID Resolution</h3>
                    </div>
                    <div className="p-4">
                        <div className="flex items-center">
                            {context.didDocument ? (
                                <>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500 text-white mr-2">
                                        ✓
                                    </div>
                                    <span>DID resolves with TRQP service</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white mr-2">
                                        ✗
                                    </div>
                                    <span>DID resolution failed: {context.errors?.didResolution}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-semibold">API Conformance Tests</h3>
                    </div>
                    <div className="p-4">
                        {context.apiTestReport ? (
                            <div>
                                <div className="flex items-center">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                        context.apiTestReport.failedCount === 0 ? 'bg-green-500' : 'bg-yellow-500'
                                    } text-white mr-2`}>
                                        {context.apiTestReport.failedCount === 0 ? '✓' : '!'}
                                    </div>
                                    <span>
                                        {context.apiTestReport.failedCount === 0 
                                            ? "All API conformance tests passed" 
                                            : "Some API conformance tests failed"}
                                    </span>
                                </div>
                                <div className="mt-2 text-sm">
                                    <p>Tests passed: {context.apiTestReport.passedCount} of {context.apiTestReport.passedCount + context.apiTestReport.failedCount}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">API conformance tests not run</p>
                        )}
                    </div>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-semibold">Authorization Verification</h3>
                    </div>
                    <div className="p-4">
                        {context.authResult ? (
                            <div className="flex items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    context.authResult.authorized ? 'bg-green-500' : 'bg-red-500'
                                } text-white mr-2`}>
                                    {context.authResult.authorized ? '✓' : '✗'}
                                </div>
                                <span>
                                    {context.authResult.authorized 
                                        ? `Entity ${context.entityId} is authorized for ${context.authorizationId}` 
                                        : `Entity ${context.entityId} is not authorized for ${context.authorizationId}`}
                                </span>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">Authorization verification not run</p>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="mt-8 flex justify-end">
                <button
                    onClick={onRestart}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Start New Test
                </button>
            </div>
        </div>
    );
}
