/**
 * Trust Registry API Service
 * 
 * This service handles interactions with the Trust Registry API
 * and implements the conformance tests based on the Python implementation
 */

import { generateNonce } from './didResolver';

const encodePath = (segment: string) => encodeURIComponent(segment);

const AYRA_ENDPOINTS = {
    metadata: "/metadata",
    entity: (entityId: string) => `/entities/${encodePath(entityId)}`,
    entityAuthorizations: (entityDid: string) => `/entities/${encodePath(entityDid)}/authorizations`,
    ecosystem: (ecosystemDid: string) => `/ecosystems/${encodePath(ecosystemDid)}`,
    ecosystemRecognitions: (ecosystemDid: string) => `/ecosystems/${encodePath(ecosystemDid)}/recognitions`,
    assuranceLevels: "/lookups/assuranceLevels",
    authorizations: "/lookups/authorizations",
    didMethods: "/lookups/didMethods",
    authorization: "/authorization",
    recognition: "/recognition",
} as const;

const successOrDocumentedStatus = [200, 401, 404, 501];

async function readJsonOrText(response: Response): Promise<{ json?: any; raw: string }> {
    const raw = await response.text().catch(() => "");
    if (!raw) return { raw };
    try {
        return { json: JSON.parse(raw), raw };
    } catch {
        return { raw };
    }
}

function isJsonObject(value: any): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseSummary(response: Response, raw = ""): string {
    const summary = `${response.status} ${response.statusText}`.trim();
    return raw ? `${summary}: ${raw.slice(0, 300)}` : summary;
}

function recordDocumentedExtensionStatus(testResult: TestResult, response: Response, raw = "", json?: any): boolean {
    if (response.status === 200) return false;
    testResult.status = "passed";
    testResult.details =
        response.status === 501
            ? `Documented not implemented response: ${responseSummary(response, raw)}`
            : `Documented extension response: ${responseSummary(response, raw)}`;
    testResult.response = typeof json !== "undefined" ? json : raw;
    return true;
}

export interface TestResult {
    name: string;
    description: string;
    status: 'passed' | 'failed';
    details?: string;
    response?: any;
}

export interface ConformanceTestReport {
    testResults: TestResult[];
    passedCount: number;
    failedCount: number;
    timestamp: string;
}

/**
 * Test GET /metadata endpoint
 */
export const testGetMetadata = async (baseUrl: string, headers = {}): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "GET /metadata",
        description: "Tests the metadata endpoint for basic information about the Trust Registry",
        status: 'failed'
    };
    
    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.metadata}`;
        const response = await fetch(url, { headers });
        
        if (!successOrDocumentedStatus.includes(response.status)) {
            testResult.details = `Unexpected status code: ${response.status}`;
            return testResult;
        }
        const body = await readJsonOrText(response);
        if (recordDocumentedExtensionStatus(testResult, response, body.raw, body.json)) {
            return testResult;
        }
        
        if (response.status === 200) {
            const data = body.json;
            if (typeof data !== 'object') {
                testResult.details = "Expected JSON object for metadata";
                return testResult;
            }
            
            // Check required fields from RegistryMetadataType (current TRQP spec)
            // The Ayra metadata endpoint currently returns a free-form object.
            // We only ensure the payload is an object; specific keys are implementation-defined.
            
            testResult.response = data;
        }
        
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return testResult;
};

/**
 * Test GET /entities/{entity_id}
 */
export const testGetEntityInformation = async (
    baseUrl: string, 
    entityId: string, 
    headers = {}
): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "GET /entities/{entity_id}",
        description: "Tests retrieving information about a specific entity",
        status: 'failed'
    };
    
    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.entity(entityId)}`;
        const response = await fetch(url, { headers });
        
        if (!successOrDocumentedStatus.includes(response.status)) {
            testResult.details = `Unexpected status code: ${response.status}`;
            return testResult;
        }
        const body = await readJsonOrText(response);
        if (recordDocumentedExtensionStatus(testResult, response, body.raw, body.json)) {
            return testResult;
        }
        
        if (response.status === 200) {
            const data = body.json;
            if (typeof data !== 'object') {
                testResult.details = "Expected a JSON object for entity info";
                return testResult;
            }
            
            testResult.response = data;
        }
        
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return testResult;
};

/**
 * Test POST /authorization
 */
export const testCheckEntityAuthorization = async (
    baseUrl: string, 
    entityId: string, 
    authorizationId: string,
    ecosystemDid: string,
    headers = {}
): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "POST /authorization",
        description: "Tests checking if an entity is authorized for a specific action",
        status: 'failed'
    };
    
    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.authorization}`;
        const body = {
            entity_id: entityId,
            authority_id: ecosystemDid,
            action: "issue",
            resource: authorizationId,
            context: {}
        };
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        
        const responseBody = await readJsonOrText(response);
        if (!response.ok) {
            testResult.details = responseSummary(response, responseBody.raw);
            return testResult;
        }
        
        if (response.status === 200) {
            const data = responseBody.json;
            
            if (!isJsonObject(data)) {
                testResult.details = "Expected a JSON object for authorization response";
                return testResult;
            }
            if (!('authorized' in data)) {
                testResult.details = "Missing 'authorized' key in authorization response";
                return testResult;
            }
            if (data.authorized !== true) {
                testResult.details = "Authorization response returned authorized=false";
                testResult.response = data;
                return testResult;
            }
            testResult.response = data;
        }
        
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return testResult;
};

/**
 * Test POST /recognition
 */
export const testCheckEcosystemRecognition = async (
    baseUrl: string, 
    ecosystemDid: string,
    egfDid: string,
    headers = {}
): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "POST /recognition",
        description: "Tests checking if an ecosystem is recognized by an EGF",
        status: 'failed'
    };
    
    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.recognition}`;
        const body = {
            entity_id: ecosystemDid,
            authority_id: egfDid,
            action: "member-of",
            resource: "ayratrustnetwork",
            context: {}
        };
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        
        const responseBody = await readJsonOrText(response);
        if (!response.ok) {
            testResult.details = responseSummary(response, responseBody.raw);
            return testResult;
        }
        
        if (response.status === 200) {
            const data = responseBody.json;
            
            if (!isJsonObject(data)) {
                testResult.details = "Expected a JSON object for recognition response";
                return testResult;
            }
            if (!('recognized' in data)) {
                testResult.details = "Missing 'recognized' key in recognition response";
                return testResult;
            }
            if (data.recognized !== true) {
                testResult.details = "Recognition response returned recognized=false";
                testResult.response = data;
                return testResult;
            }
            testResult.response = data;
        }
        
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return testResult;
};

/**
 * Test GET /entities/{entity_did}/authorizations
 */
export const testListEntityAuthorizations = async (
    baseUrl: string,
    entityDid: string,
    headers = {}
): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "GET /entities/{entity_did}/authorizations",
        description: "Tests listing authorizations for an entity",
        status: 'failed'
    };

    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.entityAuthorizations(entityDid)}`;
        const response = await fetch(url, { headers });

        if (!successOrDocumentedStatus.includes(response.status)) {
            testResult.details = `Unexpected status code: ${response.status}`;
            return testResult;
        }
        const body = await readJsonOrText(response);
        if (recordDocumentedExtensionStatus(testResult, response, body.raw, body.json)) {
            return testResult;
        }

        const data = body.json;
        if (!Array.isArray(data)) {
            testResult.details = "Expected a list for entity authorizations";
            return testResult;
        }
        testResult.response = data;
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }

    return testResult;
};

/**
 * Test GET /ecosystems/{ecosystem_did}
 */
export const testGetEcosystemInformation = async (
    baseUrl: string,
    ecosystemDid: string,
    headers = {}
): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "GET /ecosystems/{ecosystem_did}",
        description: "Tests retrieving information about a specific ecosystem",
        status: 'failed'
    };

    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.ecosystem(ecosystemDid)}`;
        const response = await fetch(url, { headers });

        if (!successOrDocumentedStatus.includes(response.status)) {
            testResult.details = `Unexpected status code: ${response.status}`;
            return testResult;
        }
        const body = await readJsonOrText(response);
        if (recordDocumentedExtensionStatus(testResult, response, body.raw, body.json)) {
            return testResult;
        }

        const data = body.json;
        if (!isJsonObject(data)) {
            testResult.details = "Expected a JSON object for ecosystem info";
            return testResult;
        }
        testResult.response = data;
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }

    return testResult;
};

/**
 * Test GET /ecosystems/{ecosystem_did}/recognitions
 */
export const testListEcosystemRecognitions = async (
    baseUrl: string, 
    ecosystemDid: string,
    headers = {}
): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "GET /ecosystems/{ecosystem_did}/recognitions",
        description: "Tests listing all recognitions for an ecosystem",
        status: 'failed'
    };
    
    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.ecosystemRecognitions(ecosystemDid)}`;
        const response = await fetch(url, { headers });
        
        if (!successOrDocumentedStatus.includes(response.status)) {
            testResult.details = `Unexpected status code: ${response.status}`;
            return testResult;
        }
        const body = await readJsonOrText(response);
        if (recordDocumentedExtensionStatus(testResult, response, body.raw, body.json)) {
            return testResult;
        }
        
        if (response.status === 200) {
            const data = body.json;
            
            if (!Array.isArray(data)) {
                testResult.details = "Expected a list of RecognitionResponse objects";
                return testResult;
            }
            testResult.response = data;
        }
        
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return testResult;
};

/**
 * Test GET /lookups/assuranceLevels
 */
export const testLookupSupportedAssuranceLevels = async (
    baseUrl: string, 
    headers = {}
): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "GET /lookups/assuranceLevels",
        description: "Tests retrieving supported assurance levels for an ecosystem",
        status: 'failed'
    };
    
    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.assuranceLevels}`;
        const response = await fetch(url, { headers });
        
        if (!successOrDocumentedStatus.includes(response.status)) {
            testResult.details = `Unexpected status code: ${response.status}`;
            return testResult;
        }
        const body = await readJsonOrText(response);
        if (recordDocumentedExtensionStatus(testResult, response, body.raw, body.json)) {
            return testResult;
        }
        
        if (response.status === 200) {
            const data = body.json;
            
            if (!Array.isArray(data)) {
                testResult.details = "Expected a list for assurance levels";
                return testResult;
            }
            testResult.response = data;
        }
        
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return testResult;
};

/**
 * Test GET /lookups/authorizations
 */
export const testLookupAuthorizations = async (
    baseUrl: string, 
    headers = {}
): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "GET /lookups/authorizations",
        description: "Tests retrieving supported authorizations for an ecosystem",
        status: 'failed'
    };
    
    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.authorizations}`;
        const response = await fetch(url, { headers });
        
        if (!successOrDocumentedStatus.includes(response.status)) {
            testResult.details = `Unexpected status code: ${response.status}`;
            return testResult;
        }
        const body = await readJsonOrText(response);
        if (recordDocumentedExtensionStatus(testResult, response, body.raw, body.json)) {
            return testResult;
        }
        
        if (response.status === 200) {
            const data = body.json;
            
            if (!Array.isArray(data)) {
                testResult.details = "Expected a list for authorization responses";
                return testResult;
            }
            testResult.response = data;
        }
        
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return testResult;
};

/**
 * Test GET /lookups/didMethods
 */
export const testLookupSupportedDIDMethods = async (
    baseUrl: string, 
    headers = {}
): Promise<TestResult> => {
    const testResult: TestResult = {
        name: "GET /lookups/didMethods",
        description: "Tests retrieving supported DID methods for an ecosystem",
        status: 'failed'
    };
    
    try {
        const url = `${baseUrl}${AYRA_ENDPOINTS.didMethods}`;
        const response = await fetch(url, { headers });
        
        if (!successOrDocumentedStatus.includes(response.status)) {
            testResult.details = `Unexpected status code: ${response.status}`;
            return testResult;
        }
        const body = await readJsonOrText(response);
        if (recordDocumentedExtensionStatus(testResult, response, body.raw, body.json)) {
            return testResult;
        }
        
        if (response.status === 200) {
            const data = body.json;
            
            if (!Array.isArray(data)) {
                testResult.details = "Expected a list of DIDMethodType objects";
                return testResult;
            }
            testResult.response = data;
        }
        
        testResult.status = 'passed';
    } catch (error) {
        testResult.details = `Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return testResult;
};

/**
 * Run Ayra extension/discovery conformance tests against a Trust Registry API.
 * Core TRQP decision checks are run by the dedicated authorization and recognition
 * verification steps so they can use user-provided semantic test data.
 */
export const runAllConformanceTests = async (
    baseUrl: string,
    bearerToken: string = "",
    entityId: string = "did:example:entity123",
    _authorizationId: string = "did:example:authz",
    ecosystemDid: string = "",
    _egfDid: string = "did:example:egf"
): Promise<ConformanceTestReport> => {
    // Remove trailing slash from baseUrl if present
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    console.log("Running tests against normalized API URL:", normalizedBaseUrl);
    
    const headers: Record<string, string> = {
        "Accept": "application/json"
    };
    
    if (bearerToken) {
        headers["Authorization"] = `Bearer ${bearerToken}`;
    }
    
    const tests = [
        await testGetMetadata(normalizedBaseUrl, headers),
        await testGetEntityInformation(normalizedBaseUrl, entityId, headers),
        await testListEntityAuthorizations(normalizedBaseUrl, entityId, headers),
        await testGetEcosystemInformation(normalizedBaseUrl, ecosystemDid || "did:example:ecosystem", headers),
        await testListEcosystemRecognitions(normalizedBaseUrl, ecosystemDid || "did:example:ecosystem", headers),
        await testLookupSupportedAssuranceLevels(normalizedBaseUrl, headers),
        await testLookupAuthorizations(normalizedBaseUrl, headers),
        await testLookupSupportedDIDMethods(normalizedBaseUrl, headers),
    ];
    
    const passedCount = tests.filter(test => test.status === 'passed').length;
    const failedCount = tests.length - passedCount;
    
    return {
        testResults: tests,
        passedCount,
        failedCount,
        timestamp: new Date().toISOString()
    };
};

/**
 * Verify an entity's authorization against the Trust Registry
 */
export const verifyEntityAuthorization = async (
    baseUrl: string,
    entityId: string,
    authorityId: string,
    action: string,
    resource: string,
    contextJson?: string,
    bearerToken: string = ""
): Promise<{ authorized: boolean; details?: any }> => {
    try {
        const headers: Record<string, string> = {
            "Accept": "application/json"
        };
        
        if (bearerToken) {
            headers["Authorization"] = `Bearer ${bearerToken}`;
        }
        
        // Remove trailing slash from baseUrl if present
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        
        const url = `${normalizedBaseUrl}/authorization`;
        console.log("Authorization URL (POST):", url);

        let parsedContext: any = {};
        if (contextJson) {
            try {
                parsedContext = JSON.parse(contextJson);
            } catch (e) {
                parsedContext = contextJson;
            }
        }

        const body = {
            entity_id: entityId,
            authority_id: authorityId,
            action,
            resource,
            context: parsedContext || {}
        };
        
        const response = await fetch(url, { 
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const detailsText = await response.text().catch(() => "");
            return {
                authorized: false,
                details: {
                    status: response.status,
                    message: response.statusText,
                    body: detailsText
                }
            };
        }
        
        const data = await response.json();
        
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                // If array, check if any item is authorized
                return {
                    authorized: data.some(item => item.authorized === true),
                    details: data
                };
            } else {
                // Single object
                return {
                    authorized: data.authorized === true,
                    details: data
                };
            }
        }
        
        return { authorized: false };
    } catch (error) {
        console.error("Error verifying authorization:", error);
        return { 
            authorized: false, 
            details: { error: error instanceof Error ? error.message : String(error) } 
        };
    }
};

/**
 * Verify recognition between ecosystems against the Trust Registry
 */
export const verifyEcosystemRecognition = async (
    baseUrl: string,
    entityId: string,
    authorityId: string,
    action: string,
    resource: string,
    contextJson?: string,
    bearerToken: string = ""
): Promise<{ recognized: boolean; details?: any }> => {
    try {
        const headers: Record<string, string> = {
            "Accept": "application/json"
        };

        if (bearerToken) {
            headers["Authorization"] = `Bearer ${bearerToken}`;
        }

        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${normalizedBaseUrl}/recognition`;

        let parsedContext: any = {};
        if (contextJson) {
            try {
                parsedContext = JSON.parse(contextJson);
            } catch (e) {
                parsedContext = contextJson;
            }
        }

        const body = {
            entity_id: entityId,
            authority_id: authorityId,
            action,
            resource,
            context: parsedContext || {}
        };

        const response = await fetch(url, { 
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const detailsText = await response.text().catch(() => "");
            return {
                recognized: false,
                details: {
                    status: response.status,
                    message: response.statusText,
                    body: detailsText
                }
            };
        }

        const data = await response.json();

        if (typeof data === 'object' && data !== null) {
            return {
                recognized: data.recognized === true,
                details: data
            };
        }

        return { recognized: false };
    } catch (error) {
        console.error("Error verifying recognition:", error);
        return {
            recognized: false,
            details: { error: error instanceof Error ? error.message : String(error) }
        };
    }
};
