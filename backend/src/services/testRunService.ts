import { PrismaClient } from "@prisma/client";
import { CreateTestRunSchema, UpdateTestRunSchema, ProcessStatus} from "@conformance-test-suite/shared/src/testRunsContract";
import { exec } from "child_process";
import { streamProcessUpdates } from "./updateService";
import { AATH_PATH, DEFAULT_ARGS } from "../config/constants";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { ProfileConfiguration, ProfileConfigurationType } from "@conformance-test-suite/shared/src/profileConfigurationContract";
import {
    createTestPlan,
    createTest,
    startTest,
    getTestStatus,
    getTestLog
} from '../clients/oid-conformance-suite-0.9.0-v2/sdk.gen';
import { config } from '../config/env';
import { TestResult } from "../models/testModel";

const COMMAND = `${AATH_PATH}/manage`;
const LOGS_DIR = path.join(AATH_PATH, ".logs");

const prisma = new PrismaClient();

interface ProcessInfo {
    pid: number;
    processId: string;
    startTime: number;
}

export async function getTestRuns(systemId: string, profileConfigurationId: string, offset: number, limit: number) {
    // First check for and update any orphaned test runs
    await updateOrphanedTestRuns(systemId, profileConfigurationId);

    return prisma.testRuns.findMany({
        where: {
            profileConfiguration: {
                id: profileConfigurationId,
                systemId: systemId
            }
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
    });
}

export async function getTestRunById(systemId: string, profileConfigurationId: string, id: number) {
    await updateOrphanedTestRuns(systemId, profileConfigurationId);
    const testRun = await prisma.testRuns.findFirst({
        where: {
            id,
            profileConfiguration: {
                id: profileConfigurationId,
                systemId: systemId
            }
        }
    });

    return testRun;
}

export async function createTestRun(systemId: string, profileConfigurationId: string, data: unknown) {
    const parsedData = CreateTestRunSchema.parse(data);

    // Verify the profile configuration exists and belongs to the system
    const profileConfig = await prisma.profileConfigurations.findFirst({
        where: {
            id: profileConfigurationId,
            systemId: systemId
        }
    }) as ProfileConfiguration;

    if (!profileConfig) {
        throw new Error("Profile configuration not found or does not belong to the specified system");
    }

    // Create the test run
    const testRun = await prisma.testRuns.create({
        data: {
            ...parsedData,
            state: 'running',
            createdAt: new Date()
        }
    });

    if(profileConfig.type === ProfileConfigurationType.API) {
        // Assume that an OID Conformance Suite is running and accessible on the address provided
        executeApiTestRun(systemId, profileConfigurationId, testRun.id, profileConfig)
            .catch(error => {
                console.error('Error executing API test run:', error);
                prisma.testRuns.update({
                    where: { id: testRun.id },
                    data: {
                        state: 'failed',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        processStatus: ProcessStatus.EXITED
                    }
                });
            });
    } else if (profileConfig.type === ProfileConfigurationType.MESSAGE) {
        // Start the AATH execution process asynchronously locally
        executeTestRunProcess(systemId, profileConfigurationId, testRun.id)
            .catch(error => {
                console.error('Error executing test run:', error);
                // Update test run state to failed
                prisma.testRuns.update({
                    where: { id: testRun.id },
                    data: {
                        state: 'failed'
                    }
                });
            });
        }

    return testRun;
}

async function executeTestRunProcess(systemId: string, profileConfigurationId: string, testRunId: number) {
    const room = `logs-${profileConfigurationId}`;
    const fullCommand = `bash ${COMMAND} ${DEFAULT_ARGS.join(" ")}`;

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Create log file stream
    const logFilePath = path.join(LOGS_DIR, `${systemId}-${profileConfigurationId}-${testRunId}.log`);
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    try {
        // First verify the command path exists
        if (!fs.existsSync(COMMAND)) {
            throw new Error(`Command path does not exist: ${COMMAND}`);
        }

        const processId = uuidv4();

        const childProcess = exec(fullCommand, {
            cwd: AATH_PATH,
            env: {
                ...process.env,
                NO_TTY: "1",
                BEHAVE_REPORT_FILENAME: `${testRunId}.json`,
                PROCESS_ID: processId  // Pass the processId to the child process if needed
            },
        });

        const processInfo: ProcessInfo = {
            pid: childProcess.pid!,
            processId: processId,
            startTime: Date.now()
        };

        // Store the process information
        await prisma.testRuns.update({
            where: { id: testRunId },
            data: {
                pid: processInfo.pid,
                processId: processInfo.processId,
                processStatus: ProcessStatus.RUNNING
            }
        });

        if (!childProcess.stdout || !childProcess.stderr) {
            throw new Error("Failed to start process streams");
        }

        // Capture and store stdout
        childProcess.stdout.on('data', (data) => {
            logStream.write(data);
        });

        // Store any error output and write to log file
        let errorOutput = '';
        childProcess.stderr?.on('data', (data) => {
            errorOutput += data.toString();
            logStream.write(data);
        });

        childProcess.on('error', async (error) => {
            await prisma.testRuns.update({
                where: { id: testRunId },
                data: {
                    state: 'failed',
                    error: `Execution error: ${error.message}`,
                    updatedAt: new Date()
                }
            });
        });

        childProcess.on('exit', async (code) => {
            console.log(`Test run process ${systemId}-${profileConfigurationId}-${testRunId} exited with code ${code}`);
            let state = code === null || code === undefined || code !== 0 ? 'failed' : 'completed';
            logStream.end(); // Close the log file stream
            let errorReadingResults = null;

            // Process results if the test completed successfully
            let results = null;
            if (state === 'completed') {
                const jsonOutputPath = path.join(AATH_PATH, ".logs", `${testRunId}.json`);
                if (fs.existsSync(jsonOutputPath)) {
                    const data = JSON.parse(fs.readFileSync(jsonOutputPath, "utf-8"));
                    const testResults = checkTests(data, "default-profile");

                    const passedTests = testResults.filter((test) => test.status === "passed");
                    const failedTests = testResults.filter((test) => test.status !== "passed");

                    results = {
                        conformantProfiles: failedTests.length === 0 ? ["default-profile"] : [],
                        isConformant: failedTests.length === 0,
                        profileResults: [{
                            profileName: "default-profile",
                            passedTests: passedTests,
                            failedTests: failedTests
                        }]
                    };

                    if (results.isConformant) {
                        await updateProfileConformanceStatus(profileConfigurationId);
                    }
                } else {
                    errorReadingResults = `Test results file does not exist: ${jsonOutputPath}`;
                    console.log(errorReadingResults);
                }
            }

            if (errorReadingResults) {
                state = 'failed';
                errorOutput += `\n${errorReadingResults}`;
            }

            let data = null;
            if (results) {
                data = {
                    state,
                    error: state === 'failed' ? errorOutput || `Process exited with code ${code}` : null,
                    updatedAt: new Date(),
                    logPath: logFilePath,
                    results: results,
                    processStatus: ProcessStatus.EXITED.toString()
                }
            } else {
                data = {
                    state,
                    error: state === 'failed' ? errorOutput || `Process exited with code ${code}` : null,
                    updatedAt: new Date(),
                    logPath: logFilePath,
                    processStatus: ProcessStatus.EXITED
                }
            }

            await prisma.testRuns.update({
                where: { id: testRunId },
                data: data
            });

        });

        streamProcessUpdates(childProcess, `${profileConfigurationId}-${testRunId}`);
    } catch (error) {
        logStream.end(); // Ensure we close the stream on error
        // Handle any synchronous errors during setup
        await prisma.testRuns.update({
            where: { id: testRunId },
            data: {
                state: 'failed',
                error: `Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                updatedAt: new Date()
            }
        });
    }
}

export async function updateTestRun(systemId: string, profileConfigurationId: string, id: number, data: unknown) {
    const parsedData = UpdateTestRunSchema.omit({ profileConfigurationId: true }).parse(data);
    return prisma.testRuns.update({
        where: {
            id,
            profileConfiguration: {
                id: profileConfigurationId,
                systemId: systemId
            }
        },
        data: parsedData,
    });
}

export async function deleteTestRun(systemId: string, profileConfigurationId: string, id: number) {
    return prisma.testRuns.delete({
        where: {
            id,
            profileConfiguration: {
                id: profileConfigurationId,
                systemId: systemId
            }
        }
    });
}

function checkTests(data: any[], profileName: string) {
    const testResults = [];

    for (const feature of data) {
        const featureName = feature.name || "Unknown Feature";
        for (const element of feature.elements || []) {
            if (element.type === "scenario") {
                testResults.push({
                    profile: profileName,
                    feature_name: featureName,
                    scenario_name: element.name,
                    status: element.status,
                    tags: element.tags || [],
                });
            }
        }
    }

    return testResults;
}

export async function getTestRunLogs(systemId: string, profileConfigurationId: string, id: number) {
    const testRun = await prisma.testRuns.findFirst({
        where: {
            id,
            profileConfiguration: {
                id: profileConfigurationId,
                systemId: systemId
            }
        }
    });

    if (!testRun) {
        throw new Error(`Requested TestRun ${id} for profile configuration ${profileConfigurationId} and system ${systemId} not found`);
    }

    if (!testRun.logPath || !fs.existsSync(testRun.logPath)) {
        console.log(`Log file for TestRun ${id} for profile configuration ${profileConfigurationId} and system ${systemId} does not exist`);
        return { logs: [] };
    }

    const logContent = fs.readFileSync(testRun.logPath, 'utf-8');
    const logs = logContent.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => ({
            type: line.includes('[ERROR]') ? 'stderr' : 'stdout',
            message: line
        }));

    return { logs };
}

async function isProcessRunning(pid: number, processId: string): Promise<boolean> {
    try {
        // First check if process exists
        process.kill(pid, 0);

        // On Linux/Unix systems, we can try to verify the process
        if (process.platform !== 'win32') {
            try {
                // Check if the process command line includes our processId
                const environ = fs.readFileSync(`/proc/${pid}/environ`, 'utf8');
                if (!environ.includes(processId)) {
                    return false; // Different process with same PID
                }
            } catch (e) {
                console.warn('Could not verify process ID:', e);
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}

async function updateOrphanedTestRuns(systemId: string, profileConfigurationId: string) {
    const runningTests = await prisma.testRuns.findMany({
        where: {
            profileConfiguration: {
                id: profileConfigurationId,
                systemId: systemId
            },
            state: 'running',
            processStatus: ProcessStatus.RUNNING.toString(),
            pid: { not: null },
            processId: { not: null }
        }
    });

    for (const test of runningTests) {
        if (!test.pid || !test.processId) continue;

        const isRunning = await isProcessRunning(test.pid, test.processId);

        if (!isRunning) {
            await prisma.testRuns.update({
                where: { id: test.id },
                data: {
                    state: 'failed',
                    error: 'Test run process no longer exists or does not match original process ID before reaching a completed state',
                    processStatus: ProcessStatus.EXITED.toString(),
                    updatedAt: new Date()
                }
            });
        }
    }
}


async function executeApiTestRun(systemId: string, profileConfigurationId: string, testRunId: number, profileConfig: ProfileConfiguration) {
    const planName = 'oid4vp-id2-wallet-test-plan';
    const moduleName = 'oid4vp-id2-wallet-happy-flow-no-state';
    try {
        // Create test plan
        const variantConfig = {
            credential_format: "sd_jwt_vc",
            client_id_scheme: "did",
            request_method: "request_uri_unsigned",
            response_mode: "direct_post"
        };

        const variantParam = encodeURIComponent(JSON.stringify(variantConfig));
        const planResponse = await fetch(`${config.OID_CONFORMANCE_SUITE_API_URL}/plan?planName=${planName}&variant=${variantParam}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "alias": "dave-example",
                "description": "dave-example",
                "server": {
                    "authorization_endpoint": "openid4vp://authorize"
                },
                "client": {
                    "presentation_definition": {
                        "id": "university_degree_presentation_definition",
                        "input_descriptors": [
                            {
                                "id": "university_degree",
                                "name": "University Degree",
                                "purpose": "Verify that the holder has a university degree",
                                "constraints": {
                                    "fields": [
                                        {
                                            "path": [
                                                "$.type"
                                            ],
                                            "filter": {
                                                "type": "array",
                                                "contains": {
                                                    "const": "UniversityDegree"
                                                }
                                            }
                                        },
                                        {
                                            "path": [
                                                "$.credentialSubject.degree.type"
                                            ],
                                            "filter": {
                                                "type": "string",
                                                "const": "BachelorDegree"
                                            }
                                        },
                                        {
                                            "path": [
                                                "$.credentialSubject.degree.name"
                                            ],
                                            "filter": {
                                                "type": "string"
                                            }
                                        },
                                        {
                                            "path": [
                                                "$.@context"
                                            ],
                                            "filter": {
                                                "type": "array",
                                                "contains": {
                                                    "const": "https://www.w3.org/2018/credentials/v1"
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    "jwks": {
                        "keys": [
                            {
                                "kty": "EC",
                                "d": "k9UAUgc505Y7EhClayWVyaaV8K_U4nMv_P0xXCE4KP8",
                                "crv": "P-256",
                                "alg": "ES256",
                                "kid": "khljdeulFBjJFBkannQf4LgMnDphp7309lcskUqtDRs",
                                "x": "qDoclYhZi28PYgKwygUHukpLnOu3A6ZIzhVjekNiGhA",
                                "y": "UhFlim9fLkrSu0s3GmT96FsBM_z1tayNbOmmM6sqjHU"
                            }
                        ]
                    },
                    "client_id": "test"
                }
            })
        }).then(res => res.json());

        if (!planResponse) {
            throw new Error("Failed to create test plan");
        }

        const planId = planResponse.id;
        const planModules = planResponse.modules;

        // Verify plan modules contains required test
        if (!Array.isArray(planModules) || !planModules.some(module => module.testModule === moduleName)) {
            throw new Error(`Test plan does not contain required test module ${moduleName}`);
        }

        // Create test module instance
        const moduleResponse = await fetch(`https://localhost:8443/api/runner?test=${moduleName}&plan=${planId}&variant=%7B%7D`, {
            method: 'POST'
        }).then(res => res.json());

        if (!moduleResponse) {
            throw new Error("Failed to create test module");
        }

        const oidModuleId = moduleResponse.id;

        // Store the module ID in the test run for status checking
        await prisma.testRuns.update({
            where: { id: testRunId },
            data: {
                processId: oidModuleId,
                processStatus: ProcessStatus.RUNNING
            }
        });

        // Start background monitoring process
        monitorApiTestProgress(systemId, profileConfigurationId, testRunId, oidModuleId);

    } catch (error) {
        console.error('Error executing API test:', error);
        await prisma.testRuns.update({
            where: { id: testRunId },
            data: {
                state: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error during API test execution',
                processStatus: ProcessStatus.EXITED
            }
        });
    }
}

async function monitorApiTestProgress(systemId: string, profileConfigurationId: string, testRunId: number, oidModuleId: string) {
    const checkStatus = async () => {
        try {
            console.log(`Checking status of test run ${testRunId} with module ID ${oidModuleId}`);

            const testInfo = await fetch(`${config.OID_CONFORMANCE_SUITE_API_URL}/info/${oidModuleId}`).then(res => res.json());

            if (!testInfo) {
                throw new Error("Failed to get test info");
            }

            const status = testInfo.status;

            // Update test run status based on response
            if (status === 'CREATED') {
                console.log("Test created");
            } else if (status === 'WAITING') {
                console.log("Test waiting for browser interaction");
                // Wallet test is waiting for browser interaction
                // Get current test runner state
                const testRunnerState = await fetch(`https://localhost:8443/api/runner/${oidModuleId}`).then(res => res.json());

                if (!testRunnerState) {
                    throw new Error("Failed to get test runner state");
                }

                // Get the first URL from the browser urls array if it exists
                const browserUrl = testRunnerState?.browser?.urls?.[0];

                console.log(`Browser URL: ${browserUrl}`);

                if (browserUrl) {
                    await prisma.testRuns.update({
                        where: { id: testRunId },
                        data: {
                            lastManualInteractionStep: browserUrl,
                            processStatus: ProcessStatus.WAITING,
                            state: 'waiting'
                        }
                    });
                } else {
                    throw new Error("No browser URL found in test runner state");
                }

            } else if (status.status === 'FINISHED') {
                // Get test logs
                const logResponse = await getTestLog({
                    path: { id: oidModuleId }
                });

                if (!logResponse.data) {
                    throw new Error("Failed to get test logs");
                }

                // Process results
                const results = processApiTestResults(logResponse.data);

                await prisma.testRuns.update({
                    where: { id: testRunId },
                    data: {
                        state: 'completed',
                        results: results,
                        processStatus: ProcessStatus.EXITED,
                        updatedAt: new Date()
                    }
                });

                // If test was successful and system is conformant, update system status
                if (results.isConformant) {
                    await updateProfileConformanceStatus(profileConfigurationId);
                }

                return; // Stop monitoring
            } else if (status.status === 'INTERRUPTED' || status.status === 'FINISHED_WITH_ERRORS') {
                await prisma.testRuns.update({
                    where: { id: testRunId },
                    data: {
                        state: 'failed',
                        error: `Test ${status.status.toLowerCase()}`,
                        processStatus: ProcessStatus.EXITED,
                        updatedAt: new Date()
                    }
                });

                return; // Stop monitoring
            }

            // Continue monitoring
            setTimeout(checkStatus, 5000); // Check every 5 seconds

        } catch (error) {
            console.error('Error monitoring API test:', error);
            await prisma.testRuns.update({
                where: { id: testRunId },
                data: {
                    state: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error during monitoring',
                    processStatus: ProcessStatus.EXITED,
                    updatedAt: new Date()
                }
            });
        }
    };

    // Start monitoring
    checkStatus();
}

function processApiTestResults(testLog: any): any {
    // Process the test log into the expected results format
    const passedTests: TestResult[] = [];
    const failedTests: TestResult[] = [];

    // Process test log results into passed/failed arrays
    // This will need to be adjusted based on the actual test log format
    testLog.results?.forEach((result: any) => {
        const testResult: TestResult = {
            profile: "default-profile",
            feature_name: result.testName || "Unknown Test",
            scenario_name: result.description || "Unknown Scenario",
            status: result.success ? "passed" : "failed",
            tags: result.tags || []
        };

        if (result.success) {
            passedTests.push(testResult);
        } else {
            failedTests.push(testResult);
        }
    });

    return {
        profileResults: [{
            profileName: "default-profile",
            passedTests,
            failedTests
        }],
        conformantProfiles: failedTests.length === 0 ? ["default-profile"] : [],
        isConformant: failedTests.length === 0
    };
}

async function updateProfileConformanceStatus(profileId: string) {
    try {
        await prisma.profileConfigurations.update({
            where: { id: profileId },
            data: {
                conformant: true,
                locked: true
            }
        });
    } catch (error) {
        console.error('Error updating profile configuration conformance status:', error);
    }
}
