/**
 * TestContext
 * 
 * This is a shared context that gets passed between test steps
 * to allow data from one step to be used in subsequent steps.
 */

import { DIDDocument } from "./didResolver";
import { ConformanceTestReport } from "./trustRegistryApi";

export interface TestContext {
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
    
    // General
    reportTimestamp?: string;
    errors?: {
        didResolution?: string | null;
        apiTest?: string | null;
        authVerification?: string | null;
    };
}

export type TestStepStatus = "pending" | "running" | "passed" | "failed" | "waiting";

export interface TestStepController {
    setStatus: (status: TestStepStatus) => void;
    setError: (error: string | null) => void;
    complete: (success: boolean) => void;
    updateContext: (updates: Partial<TestContext>) => void;
    goToNextStep: () => void;
}

/**
 * Create an empty test context
 */
export const createEmptyContext = (): TestContext => ({
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
