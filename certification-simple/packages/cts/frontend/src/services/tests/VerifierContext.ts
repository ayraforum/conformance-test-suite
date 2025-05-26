import { TestContext } from '../BaseTestContext';
import { BaseAgent } from '@/lib/core/agent/core';

export interface VerifierContext extends TestContext {
  agent?: BaseAgent;
  connection?: any;
  presentationRequest?: any;
  presentationResult?: any;
  verificationStatus?: 'pending' | 'verified' | 'failed';
}

export const createEmptyVerifierContext = (): VerifierContext => ({
  errors: {},
  verificationStatus: 'pending'
}); 