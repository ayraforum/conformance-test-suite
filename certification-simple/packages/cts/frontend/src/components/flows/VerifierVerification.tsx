import React, { useState } from 'react';
import TaskRunner from '../TaskRunner';
import { VerifierContext } from '@/services/tests/VerifierContext';
import { TestStepController } from '@/services/BaseTestContext';

interface VerifierVerificationProps {
  context: VerifierContext;
  controller: TestStepController;
  isActive: boolean;
}

const VerifierVerification: React.FC<VerifierVerificationProps> = ({
  context,
  controller,
  isActive
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const verifierTasks = [
    {
      id: 'connection',
      name: 'Verifier Connection',
      description: 'Establish connection with credential holder'
    },
    {
      id: 'presentation-request',
      name: 'Presentation Request',
      description: 'Send presentation request to holder'
    },
    {
      id: 'verification',
      name: 'Credential Verification',
      description: 'Verify received credential presentation'
    },
    {
      id: 'trust-registry',
      name: 'Trust Registry Check',
      description: 'Validate against trust registry'
    }
  ];

  const handleRunTests = async () => {
    setIsRunning(true);
    setResults([]);
    controller.setStatus('running');
    
    try {
      for (const task of verifierTasks) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        setResults(prev => [...prev, {
          taskId: task.id,
          status: 'completed',
          message: `${task.name} completed successfully`
        }]);
      }
      
      // Update context with results
      controller.updateContext({
        connectionId: 'mock-verifier-connection-id',
        presentationRequest: { id: 'mock-presentation-request-id' },
        verificationResult: { 
          verified: true, 
          trustRegistryValidated: true,
          details: 'All verifications passed'
        }
      });
      
      controller.setStatus('completed');
      controller.complete(true);
    } catch (error) {
      console.error('Test execution failed:', error);
      controller.setError(error instanceof Error ? error.message : 'Unknown error');
      controller.setStatus('failed');
      controller.complete(false);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Verifier Verification</h1>
        <p className="mt-2 text-gray-600">
          Test verifier functionality including presentation requests, verification, and trust registry validation.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Test Execution</h2>
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
          >
            {isRunning ? 'Running Tests...' : 'Run Verifier Tests'}
          </button>
        </div>

        <TaskRunner 
          tasks={verifierTasks} 
          isRunning={isRunning}
          results={results}
        />
        
        {/* Display context information */}
        {context.verificationResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-medium text-green-800">Verification Results</h3>
            <p className="text-sm text-green-600">
              Status: {context.verificationResult.verified ? 'Verified' : 'Failed'}
            </p>
            <p className="text-sm text-green-600">
              Trust Registry: {context.verificationResult.trustRegistryValidated ? 'Valid' : 'Invalid'}
            </p>
            {context.verificationResult.details && (
              <p className="text-sm text-green-600">Details: {context.verificationResult.details}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifierVerification;
