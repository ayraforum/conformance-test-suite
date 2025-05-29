/**
 * Trust Registry Test Context
 */

import { BaseTestContext } from "../BaseTestContext";
import { DIDDocument } from "../didResolver";
import { ConformanceTestReport } from "../trustRegistryApi";

export interface TrustRegistryContext extends BaseTestContext {
  // DID Resolution
  ecosystemDID?: string;
  didDocument?: DIDDocument | null;
  
  // API Testing
  apiBaseUrl?: string;
  apiTestReport?: ConformanceTestReport | null;
  
  // Authorization
  entityId?: string;
  authorizationId?: string;
  authResult?: { authorized: boolean; details?: any } | null;
  
  // Specific errors
  errors?: {
    didResolution?: string | null;
    apiTest?: string | null;
    authVerification?: string | null;
    [key: string]: string | null;
  };
}

export const createEmptyTrustRegistryContext = (): TrustRegistryContext => ({
  ecosystemDID: "",
  didDocument: null,
  apiBaseUrl: "",
  apiTestReport: null,
  entityId: "",
  authorizationId: "",
  authResult: null,
  reportTimestamp: "",
  errors: {
    didResolution: null,
    apiTest: null,
    authVerification: null
  }
});
