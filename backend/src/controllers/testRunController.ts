import { testRunContract } from "@conformance-test-suite/shared/src/testRunsContract";
import { initServer } from "@ts-rest/express";
import { ServerInferRequest, ServerInferResponses } from "@ts-rest/core";
import {
    getTestRuns,
    getTestRunById,
    createTestRun,
    updateTestRun,
    deleteTestRun,
    getTestRunLogs
} from "../services/testRunService";

export const s = initServer();

type TestRunResponses = ServerInferResponses<typeof testRunContract>;
type GetTestRunsRequest = ServerInferRequest<typeof testRunContract.getTestRuns>;
type GetTestRunRequest = ServerInferRequest<typeof testRunContract.getTestRun>;
type CreateTestRunRequest = ServerInferRequest<typeof testRunContract.createTestRun>;
type UpdateTestRunRequest = ServerInferRequest<typeof testRunContract.updateTestRun>;
type DeleteTestRunRequest = ServerInferRequest<typeof testRunContract.deleteTestRun>;
type GetTestRunLogsRequest = ServerInferRequest<typeof testRunContract.getTestRunLogs>;

export const testRunController = s.router(testRunContract, {
    getTestRuns: async ({ query, params }: GetTestRunsRequest): Promise<TestRunResponses['getTestRuns']> => {
        try {
            const offset = query.offset ?? 0;
            const limit = query.limit ?? 10;
            const testRuns = await getTestRuns(params.systemId, params.profileConfigurationId, offset, limit);
            const baseUrl = "https://api.conformance-test-suite.org";

            const enrichedTestRuns = testRuns.map((testRun) => ({
                ...testRun,
                kind: "TestRun",
                self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${testRun.id}`
            }));

            const paginatedResponse = {
                contents: enrichedTestRuns,
                kind: "TestRunsPage",
                self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs?${new URLSearchParams({ offset: offset.toString(), limit: limit.toString() }).toString()}`,
                pageOf: "test-runs",
                next: testRuns.length === limit ?
                    `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs?${new URLSearchParams({ offset: (offset + limit).toString(), limit: limit.toString() }).toString()}` :
                    null,
                previous: offset > 0 ?
                    `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs?${new URLSearchParams({ offset: Math.max(0, offset - limit).toString(), limit: limit.toString() }).toString()}` :
                    null
            };
            return { status: 200, body: paginatedResponse };
        } catch (error) {
            return {
                status: 500,
                body: {
                    status: 500,
                    type: "https://api.conformance-test-suite.org/errors/internal-server-error",
                    title: "Internal Server Error",
                    detail: error instanceof Error ? error.message : "Failed to fetch test runs",
                    instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs`,
                },
            };
        }
    },

    getTestRun: async ({ params }: GetTestRunRequest): Promise<TestRunResponses['getTestRun']> => {
        try {
            const testRunId = Number(params.id);
            if (isNaN(testRunId)) {
                return {
                    status: 400,
                    body: {
                        status: 400,
                        type: "https://api.conformance-test-suite.org/errors/bad-request",
                        title: "Invalid Test Run ID",
                        detail: "Test run ID must be a valid number",
                        instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}`,
                    },
                };
            }
            const testRun = await getTestRunById(params.systemId, params.profileConfigurationId, testRunId);
            if (!testRun) {
                return {
                    status: 404,
                    body: {
                        status: 404,
                        type: "https://api.conformance-test-suite.org/errors/not-found",
                        title: "Test Run Not Found",
                        detail: `Test run with ID ${params.id} could not be found`,
                        instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}`,
                    },
                };
            }
            const baseUrl = "https://api.conformance-test-suite.org";
            return {
                status: 200,
                body: {
                    ...testRun,
                    kind: "TestRun",
                    self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}`
                }
            };
        } catch (error) {
            return {
                status: 500,
                body: {
                    status: 500,
                    type: "https://api.conformance-test-suite.org/errors/internal-server-error",
                    title: "Internal Server Error",
                    detail: error instanceof Error ? error.message : "Failed to fetch test run",
                    instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}`,
                },
            };
        }
    },

    createTestRun: async ({ params, body }: CreateTestRunRequest): Promise<TestRunResponses['createTestRun']> => {
        try {
            const newTestRun = await createTestRun(params.systemId, params.profileConfigurationId, body);
            const baseUrl = "https://api.conformance-test-suite.org";
            return {
                status: 201,
                body: {
                    ...newTestRun,
                    kind: "TestRun",
                    self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${newTestRun.id}`
                }
            };
        } catch (error) {
            return {
                status: 400,
                body: {
                    status: 400,
                    type: "https://api.conformance-test-suite.org/errors/bad-request",
                    title: "Bad Request",
                    detail: error instanceof Error ? error.message : "Failed to create test run",
                    instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs`,
                },
            };
        }
    },

    updateTestRun: async ({ params, body }: UpdateTestRunRequest): Promise<TestRunResponses['updateTestRun']> => {
        try {
            const testRunId = Number(params.id);
            if (isNaN(testRunId)) {
                return {
                    status: 400,
                    body: {
                        status: 400,
                        type: "https://api.conformance-test-suite.org/errors/bad-request",
                        title: "Invalid Test Run ID",
                        detail: "Test run ID must be a valid number",
                        instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}`,
                    },
                };
            }
            const updatedTestRun = await updateTestRun(params.systemId, params.profileConfigurationId, testRunId, body);
            const baseUrl = "https://api.conformance-test-suite.org";
            return {
                status: 200,
                body: {
                    ...updatedTestRun,
                    kind: "TestRun",
                    self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}`
                }
            };
        } catch (error) {
            return {
                status: 400,
                body: {
                    status: 400,
                    type: "https://api.conformance-test-suite.org/errors/bad-request",
                    title: "Bad Request",
                    detail: error instanceof Error ? error.message : "Failed to update test run",
                    instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}`,
                },
            };
        }
    },

    deleteTestRun: async ({ params }: DeleteTestRunRequest): Promise<TestRunResponses['deleteTestRun']> => {
        try {
            const testRunId = Number(params.id);
            if (isNaN(testRunId)) {
                return {
                    status: 400,
                    body: {
                        status: 400,
                        type: "https://api.conformance-test-suite.org/errors/bad-request",
                        title: "Invalid Test Run ID",
                        detail: "Test run ID must be a valid number",
                        instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}`,
                    },
                };
            }
            await deleteTestRun(params.systemId, params.profileConfigurationId, testRunId);
            return { status: 204, body: { id: testRunId.toString() } };
        } catch (error) {
            return {
                status: 404,
                body: {
                    status: 404,
                    type: "https://api.conformance-test-suite.org/errors/not-found",
                    title: "Test Run Not Found",
                    detail: error instanceof Error ? error.message : "Failed to delete test run",
                    instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}`,
                },
            };
        }
    },

    getTestRunLogs: async ({ params }: GetTestRunLogsRequest): Promise<TestRunResponses['getTestRunLogs']> => {
        try {
            const testRunId = Number(params.id);
            if (isNaN(testRunId)) {
                return {
                    status: 400,
                    body: {
                        status: 400,
                        type: "https://api.conformance-test-suite.org/errors/bad-request",
                        title: "Invalid Test Run ID",
                        detail: "Test run ID must be a valid number",
                        instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}/logs`,
                    },
                };
            }
            const logs = await getTestRunLogs(params.systemId, params.profileConfigurationId, testRunId);
            const baseUrl = "https://api.conformance-test-suite.org";
            return {
                status: 200,
                body: {
                    ...logs,
                    kind: "TestRunLogs",
                    self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}/logs`
                }
            };
        } catch (error) {
            return {
                status: 404,
                body: {
                    status: 404,
                    type: "https://api.conformance-test-suite.org/errors/not-found",
                    title: "Test Run Logs Not Found",
                    detail: error instanceof Error ? error.message : "Failed to fetch test run logs",
                    instance: `/systems/${params.systemId}/profile-configurations/${params.profileConfigurationId}/test-runs/${params.id}/logs`,
                },
            };
        }
    },
});