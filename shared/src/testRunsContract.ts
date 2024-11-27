import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { ErrorResponseSchema } from './errorSchema';
import { PaginationRequestSchema, CollectionResponseSchema } from './paginationSchema';
import { ResourceResponseMetadataSchema } from './commonSchema';
import { DeleteResourceResponseSchema } from './commonSchema';

extendZodWithOpenApi(z);

const c = initContract();

export const TestRunSchema = z.object({
    id: z.string().uuid().openapi({ description: "The unique identifier for the test run" }),
    profileConfigurationId: z.string().uuid().openapi({ description: "The ID of the associated profile configuration" }),
    logs: z.array(z.string()).openapi({ description: "Array of log entries for the test run" }),
    jsonReport: z.any().optional().openapi({ description: "The JSON report data from the test run" }),
    state: z.string().openapi({ description: "The current state of the test run" }),
    // state: z.enum(['pending', 'running', 'completed', 'failed']).openapi({ description: "The current state of the test run" }),
    createdAt: z.date().openapi({ description: "When the test run was created" }),
    updatedAt: z.date().openapi({ description: "When the test run was last updated" }),
    results: z.object({
        profileResults: z.array(z.object({
            profileName: z.string(),
            passedTests: z.array(z.any()),
            failedTests: z.array(z.any()),
        })),
        conformantProfiles: z.array(z.string()),
        isConformant: z.boolean(),
    }).optional().openapi({ description: "Test run results" })
});

export const TestRunCollectionSchema = CollectionResponseSchema.extend({
    contents: z.array(TestRunSchema),
});

export const CreateTestRunSchema = TestRunSchema.omit({ id: true });
export const UpdateTestRunSchema = TestRunSchema.partial();

export const TestRunResponseSchema = z.object({
    ...ResourceResponseMetadataSchema.shape,
    ...TestRunSchema.shape,
});

export const TestRunExecutionResponseSchema = z.object({
    message: z.string().openapi({ description: "Confirmation message" })
});

export const TestRunResultsSchema = z.object({
    profileResults: z.array(z.object({
        profileName: z.string(),
        passedTests: z.array(z.any()),
        failedTests: z.array(z.any()),
    })),
    conformantProfiles: z.array(z.string()),
    isConformant: z.boolean(),
});

export type TestRun = z.infer<typeof TestRunSchema>;
export type TestRunCollection = z.infer<typeof TestRunCollectionSchema>;
export type CreateTestRun = z.infer<typeof CreateTestRunSchema>;
export type UpdateTestRun = z.infer<typeof UpdateTestRunSchema>;
export type TestRunExecutionResponse = z.infer<typeof TestRunExecutionResponseSchema>;
export type TestRunResults = z.infer<typeof TestRunResultsSchema>;

export const testRunContract = c.router({
    getTestRuns: {
        method: "GET",
        path: "/systems/:systemId/profile-configurations/:profileConfigurationId/test-runs",
        summary: "Get all test runs for a profile configuration",
        query: PaginationRequestSchema,
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" }),
            profileConfigurationId: z.string().uuid().openapi({ description: "The ID of the profile configuration" })
        }),
        description: "Get all test runs for a specific profile configuration within a system with pagination",
        responses: {
            200: TestRunCollectionSchema,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
    },
    getTestRun: {
        method: "GET",
        path: "/systems/:systemId/profile-configurations/:profileConfigurationId/test-runs/:id",
        summary: "Get single test run by ID",
        description: "Retrieve a single test run by ID for a specific profile configuration within a system",
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" }),
            profileConfigurationId: z.string().uuid().openapi({ description: "The ID of the profile configuration" }),
            id: z.string().uuid().openapi({ description: "The ID of the test run" })
        }),
        responses: {
            200: TestRunResponseSchema,
            404: ErrorResponseSchema
        },
    },
    createTestRun: {
        method: "POST",
        path: "/systems/:systemId/profile-configurations/:profileConfigurationId/test-runs",
        summary: "Create and execute a new test run",
        description: "Create a new test run for a specific profile configuration within a system and start its execution",
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" }),
            profileConfigurationId: z.string().uuid().openapi({ description: "The ID of the profile configuration" })
        }),
        body: CreateTestRunSchema.omit({ profileConfigurationId: true }),
        responses: {
            201: TestRunResponseSchema,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema,
        },
    },
    updateTestRun: {
        method: "PUT",
        path: "/systems/:systemId/profile-configurations/:profileConfigurationId/test-runs/:id",
        summary: "Update a test run",
        description: "Update an existing test run for a specific profile configuration within a system",
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" }),
            profileConfigurationId: z.string().uuid().openapi({ description: "The ID of the profile configuration" }),
            id: z.string().uuid().openapi({ description: "The ID of the test run" })
        }),
        body: UpdateTestRunSchema.omit({ profileConfigurationId: true }),
        responses: {
            200: TestRunResponseSchema,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema,
        },
    },
    deleteTestRun: {
        method: "DELETE",
        path: "/systems/:systemId/profile-configurations/:profileConfigurationId/test-runs/:id",
        summary: "Delete a test run",
        description: "Delete a test run for a specific profile configuration within a system",
        body: DeleteResourceResponseSchema,
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" }),
            profileConfigurationId: z.string().uuid().openapi({ description: "The ID of the profile configuration" }),
            id: z.string().uuid().openapi({ description: "The ID of the test run" })
        }),
        responses: {
            204: DeleteResourceResponseSchema,
            404: ErrorResponseSchema,
        },
    }
});
