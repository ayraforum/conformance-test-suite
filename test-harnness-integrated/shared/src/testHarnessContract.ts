import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { ErrorResponseSchema } from './errorSchema';
import { ResourceResponseMetadataSchema } from './commonSchema';

extendZodWithOpenApi(z);

const c = initContract();

const TestHarnessesStatusSchema = z.object({
  isInstalled: z.boolean().openapi({ description: "Whether the test harness is installed", example: true }),
  currentRevision: z.string().optional().openapi({ description: "Current revision/version of the test harness", example: "v1.2.3" }),
  isRunning: z.boolean().optional().openapi({ description: "Whether the test harness is currently running", example: false }),
});

const TestHarnessesStatusResponseSchema = z.object({
  ...ResourceResponseMetadataSchema.shape,
  ...TestHarnessesStatusSchema.shape,
});

const TestHarnessesSchema = z.object({
  aath: TestHarnessesStatusSchema,
  oidcs: TestHarnessesStatusSchema,
});

const TestHarnessesResponseSchema = z.object({
  ...ResourceResponseMetadataSchema.shape,
  ...TestHarnessesSchema.shape,
});

const TestHarnessDownloadBody = z.object({
  revision: z.string().optional().openapi({ description: "Specific revision to download. If not provided, latest version will be used", example: "v1.2.3" }),
});

export const testHarnessContract = c.router({
  getTestHarnessesStatus: {
    method: 'GET',
    path: '/test-harnesses/status',
    responses: {
      200: TestHarnessesResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get status of both test harnesses',
    description: 'Retrieves the installation and running status of both AATH and OIDCS test harnesses',
  },

  downloadAATH: {
    method: 'POST',
    path: '/test-harnesses/aath/download',
    body: TestHarnessDownloadBody,
    responses: {
      200: TestHarnessesStatusResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Download or update AATH',
    description: 'Downloads a new version or updates an existing installation of the AATH test harness',
  },

  downloadOIDCS: {
    method: 'POST',
    path: '/test-harnesses/oidcs/download',
    body: TestHarnessDownloadBody,
    responses: {
      200: TestHarnessesStatusResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Download or update OIDCS',
    description: 'Downloads a new version or updates an existing installation of the OIDCS test harness',
  },

  startOIDCS: {
    method: 'POST',
    path: '/test-harnesses/oidcs/start',
    responses: {
      200: TestHarnessesStatusResponseSchema,
      500: ErrorResponseSchema,
    },
    body: null,
    summary: 'Start OIDCS',
    description: 'Starts the OIDCS test harness if it is installed',
  },

  stopOIDCS: {
    method: 'POST',
    path: '/test-harnesses/oidcs/stop',
    responses: {
      200: TestHarnessesStatusResponseSchema,
      500: ErrorResponseSchema,
    },
    body: null,
    summary: 'Stop OIDCS',
    description: 'Stops the OIDCS test harness if it is running',
  },
});