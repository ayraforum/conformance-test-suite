import { PrismaClient } from "@prisma/client";
import { CreateTestRunSchema, UpdateTestRunSchema } from "@conformance-test-suite/shared/src/testRunsContract";
import { exec } from "child_process";
import { processes, streamLogs } from "./logService";
import { AATH_PATH, DEFAULT_ARGS } from "../config/constants";
import fs from "fs";
import path from "path";

const COMMAND = `${AATH_PATH}/manage`;

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

export async function getTestRunById(systemId: string, profileConfigurationId: string, id: string) {
    return prisma.testRuns.findFirst({
        where: {
            id,
            profileConfiguration: {
                id: profileConfigurationId,
                systemId: systemId
            }
        }
    });
}

export async function createTestRun(systemId: string, profileConfigurationId: string, data: unknown) {
    const parsedData = CreateTestRunSchema.omit({ profileConfigurationId: true }).parse(data);

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

    return prisma.testRuns.create({
        data: {
            ...parsedData,
            profileConfigurationId
        }
    });
}

export async function updateTestRun(systemId: string, profileConfigurationId: string, id: string, data: unknown) {
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

export async function deleteTestRun(systemId: string, profileConfigurationId: string, id: string) {
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

export async function executeTestRun(systemId: string, profileConfigurationId: string, testRunId: string): Promise<void> {
    // Verify the test run exists and get its data
    const testRun = await prisma.testRuns.findFirst({
        where: {
            id: testRunId,
            profileConfiguration: {
                id: profileConfigurationId,
                systemId: systemId
            }
        },
        include: {
            profileConfiguration: {
                include: {
                    system: true
                }
            }
        }
    });

    if (!testRun) {
        throw new Error("Test run not found");
    }

    if (processes[testRunId]) {
        throw new Error(`A process with ID ${testRunId} is already running.`);
    }

    const room = `logs-${testRunId}`;
    const fullCommand = `bash ${COMMAND} ${DEFAULT_ARGS.join(" ")}`;

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

    streamLogs(childProcess, room, testRunId);

    // Update test run state to "running"
    await prisma.testRuns.update({
        where: { id: testRunId },
        data: { state: "running" }
    });
}

export async function getTestRunResults(systemId: string, profileConfigurationId: string, testRunId: string) {
    // Verify the test run exists
    const testRun = await prisma.testRuns.findFirst({
        where: {
            id: testRunId,
            profileConfiguration: {
                id: profileConfigurationId,
                systemId: systemId
            }
        }
    });

    if (!testRun) {
        throw new Error("Test run not found");
    }

    const jsonOutputPath = path.join(AATH_PATH, ".logs", `${testRunId}.json`);

    if (!fs.existsSync(jsonOutputPath)) {
        throw new Error("Test results file not found");
    }

    const data = JSON.parse(fs.readFileSync(jsonOutputPath, "utf-8"));
    const testResults = checkTests(data, "default-profile");

    const passedTests = testResults.filter((test) => test.status === "passed");
    const failedTests = testResults.filter((test) => test.status !== "passed");

    return {
        profileResults: [
            {
                profileName: "default-profile",
                passedTests,
                failedTests,
            },
        ],
        conformantProfiles: failedTests.length === 0 ? ["default-profile"] : [],
        isConformant: failedTests.length === 0,
    };
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