import { TestContext } from '../BaseTestContext';
import { BaseAgent } from '@/lib/core/agent/core';

export interface HolderContext extends TestContext {
  agent?: BaseAgent;
  connection?: any;
  presentationRequest?: any;
  presentationResult?: any;
  verificationStatus?: 'pending' | 'verified' | 'failed';
}

export const createEmptyHolderContext = (): HolderContext => ({
  errors: {},
  verificationStatus: 'pending'
}); 