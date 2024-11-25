import { testContract } from "@conformance-test-suite/shared/src/testContract";
import { executeProfile, checkConformance } from "../services/testService";
import { initServer } from "@ts-rest/express";

export const s = initServer();

export const testController = s.router(testContract, {
  executeProfile: async ({ body }) => {
    try {
      await executeProfile(body);
      return { status: 200, body: { message: "Command started" } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start command";
      return { status: 500, body: { error: errorMessage } };
    }
  },
  checkConformance: async ({ params }) => {
    try {
      const conformanceResult = await checkConformance(params.runId);
      return { status: 200, body: conformanceResult };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process test results";
      const status = errorMessage === "Test results file not found" ? 404 : 500;
      return { status, body: { error: errorMessage } };
    }
  },
});
