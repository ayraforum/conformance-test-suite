// Add this interface near the top of the file
export interface ExecuteProfile {
    systemName: string;
    systemVersion: string;
    systemEndpoint: string;
    runId: string;
  }

// Add these interfaces
export interface TestResult {
profile: string;
feature_name: string;
scenario_name: string;
status: string;
tags: string[];
}

export interface ConformanceResult {
profileResults: {
    profileName: string;
    passedTests: TestResult[];
    failedTests: TestResult[];
}[];
conformantProfiles: string[];
isConformant: boolean;
}