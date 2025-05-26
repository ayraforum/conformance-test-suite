import { initServer } from '@ts-rest/express';
import { testHarnessContract } from '@conformance-test-suite/shared/src/testHarnessContract';
import * as testHarnessService from '../services/testHarnessService';
import { ServerInferRequest, ServerInferResponses } from "@ts-rest/core";

const s = initServer();

// Add type definitions using inference helpers
type TestHarnessResponses = ServerInferResponses<typeof testHarnessContract>;
type GetStatusRequest = ServerInferRequest<typeof testHarnessContract.getTestHarnessesStatus>;
type DownloadAATHRequest = ServerInferRequest<typeof testHarnessContract.downloadAATH>;
type DownloadOIDCSRequest = ServerInferRequest<typeof testHarnessContract.downloadOIDCS>;
type StartOIDCSRequest = ServerInferRequest<typeof testHarnessContract.startOIDCS>;
type StopOIDCSRequest = ServerInferRequest<typeof testHarnessContract.stopOIDCS>;

export const testHarnessController = s.router(testHarnessContract, {
    getTestHarnessesStatus: async ({}: GetStatusRequest): Promise<TestHarnessResponses['getTestHarnessesStatus']> => {
    try {
      const [aath, oidcs] = await Promise.all([
        testHarnessService.getAATHStatus(),
        testHarnessService.getOIDCSStatus()
      ]);

      const baseUrl = "https://api.conformance-test-suite.org";
      return {
        status: 200,
        body: {
          aath: aath,
          oidcs: oidcs,
          kind: "TestHarnessStatus",
          self: `${baseUrl}/test-harnesses/status`
        }
      };
    } catch (error) {
      return {
        status: 500,
        body: {
          status: 500,
          type: "https://api.conformance-test-suite.org/errors/internal-server-error",
          title: "Internal Server Error",
          detail: error instanceof Error ? error.message : "Failed to get status",
          instance: "/status",
        },
      };
    }
  },

  downloadAATH: async ({ body }: DownloadAATHRequest): Promise<TestHarnessResponses['downloadAATH']> => {
    try {
      await testHarnessService.downloadAATH(body.revision);
      const status = await testHarnessService.getAATHStatus();
      const baseUrl = "https://api.conformance-test-suite.org";
      return {
        status: 200,
        body: {
          ...status,
          kind: "AATHStatus",
          self: `${baseUrl}/test-harnesses/aath/status`
        }
      };
    } catch (error) {
      return {
        status: 500,
        body: {
          status: 500,
          type: "https://api.conformance-test-suite.org/errors/internal-server-error",
          title: "Internal Server Error",
          detail: error instanceof Error ? error.message : "Failed to download AATH",
          instance: "/aath/download",
        },
      };
    }
  },

  downloadOIDCS: async ({ body }: DownloadOIDCSRequest): Promise<TestHarnessResponses['downloadOIDCS']> => {
    try {
      await testHarnessService.downloadOIDCS(body.revision);
      const status = await testHarnessService.getOIDCSStatus();
      const baseUrl = "https://api.conformance-test-suite.org";
      return {
        status: 200,
        body: {
          ...status,
          kind: "OIDCSStatus",
          self: `${baseUrl}/test-harnesses/oidcs/status`
        }
      };
    } catch (error) {
      return {
        status: 500,
        body: {
          status: 500,
          type: "https://api.conformance-test-suite.org/errors/internal-server-error",
          title: "Internal Server Error",
          detail: error instanceof Error ? error.message : "Failed to download OIDCS",
          instance: "/oidcs/download",
        },
      };
    }
  },

  startOIDCS: async ({}: StartOIDCSRequest): Promise<TestHarnessResponses['startOIDCS']> => {
    try {
      await testHarnessService.startOIDCS();
      const status = await testHarnessService.getOIDCSStatus();
      const baseUrl = "https://api.conformance-test-suite.org";
      return {
        status: 200,
        body: {
          ...status,
          kind: "OIDCSStatus",
          self: `${baseUrl}/test-harnesses/oidcs/status`
        }
      };
    } catch (error) {
      return {
        status: 500,
        body: {
          status: 500,
          type: "https://api.conformance-test-suite.org/errors/internal-server-error",
          title: "Internal Server Error",
          detail: error instanceof Error ? error.message : "Failed to start OIDCS",
          instance: "/oidcs/start",
        },
      };
    }
  },

  stopOIDCS: async ({}: StopOIDCSRequest): Promise<TestHarnessResponses['stopOIDCS']> => {
    try {
      await testHarnessService.stopOIDCS();
      const status = await testHarnessService.getOIDCSStatus();
      const baseUrl = "https://api.conformance-test-suite.org";
      return {
        status: 200,
        body: {
          ...status,
          kind: "OIDCSStatus",
          self: `${baseUrl}/test-harnesses/oidcs/status`
        }
      };
    } catch (error) {
      return {
        status: 500,
        body: {
          status: 500,
          type: "https://api.conformance-test-suite.org/errors/internal-server-error",
          title: "Internal Server Error",
          detail: error instanceof Error ? error.message : "Failed to stop OIDCS",
          instance: "/oidcs/stop",
        },
      };
    }
  },
});