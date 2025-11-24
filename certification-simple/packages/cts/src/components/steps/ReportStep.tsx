import React from "react";
import { TestContext, TestStepController } from "@/services/TestContext";

interface ReportStepProps {
    context: TestContext;
    controller: TestStepController;
    isActive: boolean;
    onRestart: () => void;
}

export function ReportStep({ context, controller, isActive, onRestart }: ReportStepProps) {
    const [showApiDetails, setShowApiDetails] = React.useState(false);
    const [showAuthDetails, setShowAuthDetails] = React.useState(false);
    const [showRecognitionDetails, setShowRecognitionDetails] = React.useState(false);
    
    React.useEffect(() => {
        setShowApiDetails(false);
        setShowAuthDetails(false);
        setShowRecognitionDetails(false);
    }, [context.apiTestReport]);
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
        if (!context.recognitionResult) return "Incomplete";
        
        const hasTrqpService = context.didDocument.service?.some(svc => svc.type === "TRQP") || false;
        const apiTestsPassed = context.apiTestReport.failedCount === 0;
        const isAuthorized = context.authResult.authorized || false;
        const isRecognized = context.recognitionResult.recognized || false;
        
        if (!hasTrqpService) return "Failed";
        if (!apiTestsPassed) return "Partial";
        
        return isAuthorized && isRecognized ? "Passed" : "Partial";
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
                                context.useKnownEndpoint ? (
                                    <>
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-500 text-white mr-2">
                                            –
                                        </div>
                                        <span>DID resolution bypassed (using provided TRQP endpoint)</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500 text-white mr-2">
                                            ✓
                                        </div>
                                        <span>DID resolves with TRQP service</span>
                                    </>
                                )
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
                        <h3 className="font-semibold">Ayra Extension API Tests</h3>
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
                                
                                <div className="mt-4">
                                    <button
                                        onClick={() => setShowApiDetails(prev => !prev)}
                                        className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                                    >
                                        {showApiDetails ? "Hide Details" : "View Details"}
                                    </button>
                                </div>

                                {showApiDetails && (
                                    <div className="mt-4 space-y-3 max-h-96 overflow-y-auto border-t pt-3">
                                        {context.apiTestReport.testResults.map((test, idx) => (
                                            <div key={idx} className="border rounded overflow-hidden">
                                                <div className={`p-3 flex justify-between items-center ${
                                                    test.status === 'passed' ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'
                                                }`}>
                                                    <div>
                                                        <h4 className="font-semibold">{test.name}</h4>
                                                        <p className="text-sm text-gray-600">{test.description}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-sm ${
                                                        test.status === 'passed' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                                    }`}>
                                                        {test.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                {test.details && (
                                                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                                                        <p className="text-sm font-medium text-gray-700">Details:</p>
                                                        <p className="text-sm text-gray-600">{test.details}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                            <>
                                <div className="flex items-center">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                        context.authResult.authorized ? 'bg-green-500' : 'bg-red-500'
                                    } text-white mr-2`}>
                                        {context.authResult.authorized ? '✓' : '✗'}
                                    </div>
                                    <span>
                                        {context.authResult.authorized 
                                            ? `${context.entityId} is authorized by ${context.authorityId} to ${context.action} ${context.resource}` 
                                            : `${context.entityId} is not authorized by ${context.authorityId} to ${context.action} ${context.resource}`}
                                    </span>
                                </div>
                                {context.authResult.details && (
                                    <div className="mt-3">
                                        <button
                                            onClick={() => setShowAuthDetails(prev => !prev)}
                                            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                                        >
                                            {showAuthDetails ? "Hide Details" : "View Details"}
                                        </button>
                                        {showAuthDetails && (
                                            <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 max-h-64 overflow-auto">
                                                <pre className="text-xs">
                                                    {JSON.stringify(context.authResult.details, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-500 italic">Authorization verification not run</p>
                        )}
                    </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-semibold">Recognition Verification</h3>
                    </div>
                    <div className="p-4">
                        {context.recognitionResult ? (
                            <>
                                <div className="flex items-center">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                        context.recognitionResult.recognized ? 'bg-green-500' : 'bg-red-500'
                                    } text-white mr-2`}>
                                        {context.recognitionResult.recognized ? '✓' : '✗'}
                                    </div>
                                    <span>
                                        {context.recognitionResult.recognized
                                            ? `${context.recognitionEntityId || "Ecosystem"} recognizes ${context.recognitionResource || "target"}`
                                            : `${context.recognitionEntityId || "Ecosystem"} does not recognize ${context.recognitionResource || "target"}`}
                                    </span>
                                </div>
                                {context.recognitionResult.details && (
                                    <div className="mt-3">
                                        <button
                                            onClick={() => setShowRecognitionDetails(prev => !prev)}
                                            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                                        >
                                            {showRecognitionDetails ? "Hide Details" : "View Details"}
                                        </button>
                                        {showRecognitionDetails && (
                                            <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 max-h-64 overflow-auto">
                                                <pre className="text-xs">
                                                    {JSON.stringify(context.recognitionResult.details, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-500 italic">Recognition verification not run</p>
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
