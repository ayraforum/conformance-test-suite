import React, { useState, useEffect } from 'react';
import { HolderContext } from '@/services/tests/HolderContext';
import { TestStepController } from '@/services/BaseTestContext';
import QRCodeViewer from '@/components/RenderQRCode';
import { io, Socket } from 'socket.io-client';

interface HolderVerificationProps {
  context: HolderContext;
  controller: TestStepController;
  isActive: boolean;
}

interface HolderFlowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data?: any;
}

interface DAGNode {
  id: string;
  task: {
    name: string;
    description: string;
    state: {
      status: string;
      messages: string[];
      errors: string[];
    };
  };
}

interface DAGData {
  metadata: {
    name: string;
  };
  nodes: DAGNode[];
}

const HolderVerification: React.FC<HolderVerificationProps> = ({
  context,
  controller,
  isActive
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<HolderFlowStep[]>([
    {
      id: 'connection',
      name: 'Connection Setup',
      description: 'Generate QR code and wait for holder to scan',
      status: 'pending'
    },
    {
      id: 'presentation-request',
      name: 'Presentation Request',
      description: 'Send presentation request to holder',
      status: 'pending'
    },
    {
      id: 'presentation-received',
      name: 'Presentation Verified',
      description: 'Receive and verify presentation from holder',
      status: 'pending'
    }
  ]);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Not connected');
  const [dagData, setDagData] = useState<DAGData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to CTS server');
    });

    newSocket.on('invitation', (invitationUrl: string) => {
      console.log('Received invitation:', invitationUrl);
      setQrCode(invitationUrl);
      updateStepStatus('connection', 'completed', { qrCode: invitationUrl });
      setConnectionStatus('QR Code Generated - Waiting for scan');
    });

    newSocket.on('dag-update', (data: { dag: DAGData }) => {
      console.log('DAG Update:', data.dag);
      setDagData(data.dag);
      updateStepsFromDAG(data.dag);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from CTS server');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Update step status based on DAG data
  const updateStepsFromDAG = (dag: DAGData) => {
    if (!dag || !dag.nodes) return;

    dag.nodes.forEach((node, index) => {
      const stepId = getStepIdFromNodeIndex(index);
      if (stepId) {
        let status: 'pending' | 'running' | 'completed' | 'failed' = 'pending';
        
        switch (node.task.state.status) {
          case 'Running':
          case 'Pending':
            status = 'running';
            setCurrentStep(index);
            break;
          case 'Accepted':
          case 'Completed':
            status = 'completed';
            break;
          case 'Failed':
            status = 'failed';
            break;
          default:
            status = 'pending';
        }

        updateStepStatus(stepId, status, {
          messages: node.task.state.messages,
          errors: node.task.state.errors,
          taskName: node.task.name
        });

        // Update connection status based on task progress
        if (stepId === 'connection' && status === 'running') {
          setConnectionStatus('Establishing connection...');
        } else if (stepId === 'connection' && status === 'completed') {
          setConnectionStatus('Connected - Wallet scanned QR code');
        } else if (stepId === 'presentation-request' && status === 'running') {
          setConnectionStatus('Sending presentation request...');
        } else if (stepId === 'presentation-received' && status === 'running') {
          setConnectionStatus('Verifying presentation...');
        } else if (stepId === 'presentation-received' && status === 'completed') {
          setConnectionStatus('Presentation verified successfully');
        }
      }
    });

    // Check if all steps are completed
    const allCompleted = dag.nodes.every(node => 
      node.task.state.status === 'Accepted' || node.task.state.status === 'Completed'
    );
    
    if (allCompleted) {
      setIsRunning(false);
      controller.setStatus('completed');
      controller.complete(true);
    }

    // Check if any step failed
    const anyFailed = dag.nodes.some(node => node.task.state.status === 'Failed');
    if (anyFailed) {
      setIsRunning(false);
      controller.setStatus('failed');
      controller.complete(false);
    }
  };

  const getStepIdFromNodeIndex = (index: number): string | null => {
    const stepMap = ['connection', 'presentation-request', 'presentation-received'];
    return stepMap[index] || null;
  };

  // Update step status
  const updateStepStatus = (stepId: string, status: 'pending' | 'running' | 'completed' | 'failed', data?: any) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, status, data }
          : step
      )
    );
  };

  // Start the holder verification flow
  const startFlow = async () => {
    setIsRunning(true);
    controller.setStatus('running');
    
    try {
      // Select the holder test pipeline
      await fetch('http://localhost:3001/api/select/pipeline?pipeline=HOLDER_TEST');
      
      // Start the pipeline execution
      await fetch('http://localhost:3001/api/run');
      
      console.log('Holder test pipeline started');
    } catch (error) {
      console.error('Failed to start holder verification:', error);
      setIsRunning(false);
      controller.setError(error instanceof Error ? error.message : 'Failed to start test');
      controller.setStatus('failed');
      controller.complete(false);
    }
  };

  const renderCurrentStepContent = () => {
    const step = steps[currentStep];
    
    switch (step?.id) {
      case 'connection':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-4">Scan QR Code with Holder Wallet</h3>
              {qrCode ? (
                <div className="flex flex-col items-center space-y-4">
                  <QRCodeViewer value={qrCode} />
                  <p className="text-sm text-gray-600">{connectionStatus}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-500">Generating QR Code...</p>
                  </div>
                </div>
              )}
            </div>
            {step.data?.messages && step.data.messages.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800">Task Progress:</h4>
                <ul className="mt-2 text-sm text-blue-700">
                  {step.data.messages.map((message: string, index: number) => (
                    <li key={index}>• {message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
        
      case 'presentation-request':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sending Presentation Request</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800">Requesting:</h4>
              <ul className="mt-2 text-sm text-blue-700">
                <li>• GAN Employee Credential</li>
                <li>• Attributes: name, role, company, EGF</li>
                <li>• Issuer verification via Trust Registry</li>
              </ul>
            </div>
            {step.data?.messages && step.data.messages.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800">Progress:</h4>
                <ul className="mt-2 text-sm text-green-700">
                  {step.data.messages.map((message: string, index: number) => (
                    <li key={index}>• {message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
        
      case 'presentation-received':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Verifying Presentation</h3>
            {step.status === 'completed' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800">✓ Verification Complete!</h4>
                <div className="mt-2 space-y-1 text-sm text-green-700">
                  <p>✓ Credential signature valid</p>
                  <p>✓ Trust Registry validation passed</p>
                  <p>✓ All requested attributes verified</p>
                </div>
              </div>
            ) : step.status === 'failed' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800">✗ Verification Failed</h4>
                {step.data?.errors && step.data.errors.length > 0 && (
                  <ul className="mt-2 text-sm text-red-700">
                    {step.data.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Verifying presentation...</p>
              </div>
            )}
            {step.data?.messages && step.data.messages.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800">Verification Details:</h4>
                <ul className="mt-2 text-sm text-gray-700">
                  {step.data.messages.map((message: string, index: number) => (
                    <li key={index}>• {message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
        
      default:
        return <p>Unknown step</p>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Holder Verification Flow</h1>
        <p className="mt-2 text-gray-600">
          Test the complete holder verification process using real agent connections and credential verification.
        </p>
        {dagData && (
          <p className="mt-1 text-sm text-blue-600">
            Pipeline: {dagData.metadata.name}
          </p>
        )}
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                ${step.status === 'completed' ? 'bg-green-500 text-white' : 
                  step.status === 'running' ? 'bg-blue-500 text-white animate-pulse' : 
                  step.status === 'failed' ? 'bg-red-500 text-white' :
                  'bg-gray-200 text-gray-600'}
              `}>
                {step.status === 'completed' ? '✓' : 
                 step.status === 'failed' ? '✗' : 
                 step.status === 'running' ? '⟳' :
                 index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  h-1 w-24 mx-4
                  ${steps[index + 1].status !== 'pending' ? 'bg-green-300' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((step) => (
            <div key={step.id} className="text-xs text-gray-600 max-w-24 text-center">
              {step.name}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Test Execution</h2>
          {!isRunning && !dagData && (
            <button
              onClick={startFlow}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md font-medium"
            >
              Start Holder Test
            </button>
          )}
          {isRunning && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Running...
            </div>
          )}
        </div>

        {/* Current Step Content */}
        <div className="min-h-64">
          {renderCurrentStepContent()}
        </div>

        {/* DAG Status */}
        {dagData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium mb-4">Pipeline Status</h3>
            <div className="space-y-2">
              {dagData.nodes.map((node, index) => (
                <div key={node.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{node.task.name}</h4>
                    <p className="text-sm text-gray-600">{node.task.description}</p>
                  </div>
                  <div className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${node.task.state.status === 'Accepted' || node.task.state.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      node.task.state.status === 'Running' || node.task.state.status === 'Pending' ? 'bg-blue-100 text-blue-800' :
                      node.task.state.status === 'Failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'}
                  `}>
                    {node.task.state.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolderVerification;
