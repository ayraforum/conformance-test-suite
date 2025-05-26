import { BaseTestContext } from "../BaseTestContext";

export interface TrustRegistryContext extends BaseTestContext {
  // DID Resolution
  ecosystemDid?: string;
  didDocument?: any;
  trqpEndpoints?: string[];
  
  // API Testing
  apiTestResults?: {
    healthCheck: boolean;
    openApiSpec: boolean;
    entityQuery: boolean;
    authorizationQuery: boolean;
  };
  
  // Authorization Testing
  entityId?: string;
  action?: string;
  resourceType?: string;
  authorizationResult?: {
    authorized: boolean;
    reason?: string;
    details?: any;
  };
  
  // Test Results
  overallStatus?: 'passed' | 'failed' | 'pending';
  conformanceScore?: number;
  
  errors: {
    didResolution?: string;
    apiTest?: string;
    authVerification?: string;
  };
}

export function createEmptyTrustRegistryContext(): TrustRegistryContext {
  return {
    errors: {}
  };
}
