// components/connectors/VerifierConnector.tsx
import React, { useEffect, useState } from 'react';
import { TestService } from '@/services/TestService';
import { PipelineType } from '@/types/PipelineType';

interface VerifierConnectorProps {
  children: React.ReactNode;
}

export function VerifierConnector({ children }: VerifierConnectorProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the Verifier test pipeline when the component mounts
  useEffect(() => {
    const initialize = async () => {
      try {
        await TestService.selectPipeline(PipelineType.VERIFIER_TEST);
        console.log('Verifier Test pipeline selected');
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize Verifier test:', err);
        setError('Failed to initialize Verifier test. Please try again.');
      }
    };

    initialize();
  }, []);

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
        <button 
          className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-4">Initializing Verifier Test...</span>
      </div>
    );
  }

  return <>{children}</>;
}
