import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { extendZodWithOpenApi } from '@anatine/zod-openapi';

extendZodWithOpenApi(z);

// Initialize the contract
const c = initContract();

// Define Zod schemas for request and response validation
const ExecuteProfileSchema = z.object({
  systemName: z.string(),
  systemVersion: z.string(),
  systemEndpoint: z.string(),
  runId: z.string(),
});

const TestResultSchema = z.object({
  profile: z.string(),
  feature_name: z.string(),
  scenario_name: z.string(),
  status: z.string(),
  tags: z.array(z.string()),
});

const ConformanceResultSchema = z.object({
  profileResults: z.array(
    z.object({
      profileName: z.string(),
      passedTests: z.array(TestResultSchema),
      failedTests: z.array(TestResultSchema),
    })
  ),
  conformantProfiles: z.array(z.string()),
  isConformant: z.boolean(),
});

// Create the contract
export const testContract = c.router({
  executeProfile: {
    method: "POST",
    path: "/execute-profile",
    body: ExecuteProfileSchema,
    responses: {
      200: z.object({ message: z.string() }),
      400: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
  },
  checkConformance: {
    method: "GET",
    path: "/check-conformance/:runId",
    responses: {
      200: ConformanceResultSchema,
      404: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
  },
});
