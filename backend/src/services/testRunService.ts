import { PrismaClient } from "@prisma/client";
import { CreateTestRunSchema, UpdateTestRunSchema } from "@conformance-test-suite/shared/src/testRunsContract";
import { exec } from "child_process";
import { processes, streamLogs } from "./logService";
import { AATH_PATH, DEFAULT_ARGS } from "../config/constants";
import fs from "fs";
import path from "path";

const COMMAND = `${AATH_PATH}/manage`;
const LOGS_DIR = path.join(AATH_PATH, ".logs");

const prisma = new PrismaClient();

export async function getTestRuns(systemId: string, profileConfigurationId: string, offset: number, limit: number) {
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
        return null;
    }

    // If the test run is completed and doesn't have results yet, process them
    if (testRun.state === 'completed' && !testRun.results) {
        const jsonOutputPath = path.join(AATH_PATH, ".logs", `${testRun.id}.json`);

        if (fs.existsSync(jsonOutputPath)) {
            const data = JSON.parse(fs.readFileSync(jsonOutputPath, "utf-8"));
            const testResults = checkTests(data, "default-profile");

            const passedTests = testResults.filter((test) => test.status === "passed");
            const failedTests = testResults.filter((test) => test.status !== "passed");

            // Create results object directly on the TestRun
            const results = {
                conformantProfiles: failedTests.length === 0 ? ["default-profile"] : [],
                isConformant: failedTests.length === 0,
                profileResults: [{
                    profileName: "default-profile",
                    passedTests: passedTests,
                    failedTests: failedTests
                }]
            };

            // Update the testRun with the results JSON
            await prisma.testRuns.update({
                where: { id: testRun.id },
                data: {
                    results: results
                }
            });

            testRun.results = results;
        }
    }

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
    });

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

    // Start the execution process asynchronously
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

        const childProcess = exec(fullCommand, {
            cwd: AATH_PATH,
            env: {
                ...process.env,
                NO_TTY: "1",
                BEHAVE_REPORT_FILENAME: `${testRunId}.json`
            },
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
            const state = code === 0 ? 'completed' : 'failed';
            logStream.end(); // Close the log file stream

            await prisma.testRuns.update({
                where: { id: testRunId },
                data: {
                    state,
                    error: state === 'failed' ? errorOutput || `Process exited with code ${code}` : null,
                    updatedAt: new Date(),
                    logPath: logFilePath // Store the log file path in the database
                }
            });
        });

        streamLogs(childProcess, room, `${profileConfigurationId}-${testRunId}`);
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