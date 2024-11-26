import { CreateSystemSchema, IdParamSchema, systemContract, UpdateSystemSchema } from "@conformance-test-suite/shared/src/systemContract";
import { initServer } from "@ts-rest/express";
import { ServerInferRequest, ServerInferResponses } from "@ts-rest/core";
import {
  getSystems,
  getSystemById,
  createSystem,
  updateSystem,
  deleteSystem
} from "../services/systemService";
import { ErrorResponseSchema } from "@conformance-test-suite/shared/src/errorSchema";
import { PaginationRequestSchema } from "@conformance-test-suite/shared/src/paginationSchema";

export const s = initServer();

// Add type definitions using inference helpers
type SystemResponses = ServerInferResponses<typeof systemContract>;
type GetSystemsRequest = ServerInferRequest<typeof systemContract.getSystems>;
type GetSystemRequest = ServerInferRequest<typeof systemContract.getSystem>;
type CreateSystemRequest = ServerInferRequest<typeof systemContract.createSystem>;
type UpdateSystemRequest = ServerInferRequest<typeof systemContract.updateSystem>;
// type DeleteSystemRequest = ServerInferRequest<typeof systemContract.deleteSystem>;

export const systemController = s.router(systemContract, {
  getSystems: async ({ query }: GetSystemsRequest): Promise<SystemResponses['getSystems']> => {
    try {
      const offset = query.offset ?? 0;
      const limit = query.limit ?? 10;
      const systems = await getSystems(offset, limit);
      const baseUrl = "https://api.conformance-test-suite.org";
      const paginatedResponse = {
        contents: systems,
        kind: "SystemsPage",
        self: `${baseUrl}/systems?${new URLSearchParams({ offset: offset.toString(), limit: limit.toString() }).toString()}`,
        pageOf: "systems",
        next: systems.length === limit ?
          `${baseUrl}/systems?${new URLSearchParams({ offset: (offset + limit).toString(), limit: limit.toString() }).toString()}` :
          null,
        previous: offset > 0 ?
          `${baseUrl}/systems?${new URLSearchParams({ offset: Math.max(0, offset - limit).toString(), limit: limit.toString() }).toString()}` :
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
          detail: error instanceof Error ? error.message : "Failed to fetch systems",
          instance: `/systems?${new URLSearchParams({ offset: (query.offset ?? 0).toString(), limit: (query.limit ?? 10).toString() }).toString()}`,
        },
      };
    }
  },

  getSystem: async ({ params }: GetSystemRequest): Promise<SystemResponses['getSystem']> => {
    try {
      const system = await getSystemById(params.id);
      if (!system) {
        return {
          status: 404,
          body: {
            status: 404,
            type: "https://api.conformance-test-suite.org/errors/not-found",
            title: "System Not Found",
            detail: `System with ID ${params.id} could not be found`,
            instance: `/systems/${params.id}`,
          },
        };
      }
      return { status: 200, body: system };
    } catch (error) {
      return {
        status: 500,
        body: {
          status: 500,
          type: "https://api.conformance-test-suite.org/errors/internal-server-error",
          title: "Internal Server Error",
          detail: error instanceof Error ? error.message : "Failed to fetch system",
          instance: `/systems/${params.id}`,
        },
      };
    }
  },

  createSystem: async ({ body }: CreateSystemRequest): Promise<SystemResponses['createSystem']> => {
    try {
      const newSystem = await createSystem(body);
      return { status: 201, body: newSystem };
    } catch (error) {
      return {
        status: 400,
        body: {
          status: 400,
          type: "https://api.conformance-test-suite.org/errors/bad-request",
          title: "Bad Request",
          detail: error instanceof Error ? error.message : "Failed to create system",
          instance: "/systems",
        },
      };
    }
  },

  updateSystem: async ({ params, body }: UpdateSystemRequest): Promise<SystemResponses['updateSystem']> => {
    try {
      const updatedSystem = await updateSystem(params.id, body);
      if (!updatedSystem) {
        return {
          status: 404,
          body: {
            status: 404,
            type: "https://api.conformance-test-suite.org/errors/not-found",
            title: "System Not Found",
            detail: `System with ID ${params.id} could not be found`,
            instance: `/systems/${params.id}`,
          },
        };
      }
      return { status: 200, body: updatedSystem };
    } catch (error) {
      return {
        status: 400,
        body: {
          status: 400,
          type: "https://api.conformance-test-suite.org/errors/bad-request",
          title: "Bad Request",
          detail: error instanceof Error ? error.message : "Failed to update system",
          instance: `/systems/${params.id}`,
        },
      };
    }
  },

  // deleteSystem: async ({ params }: DeleteSystemRequest): Promise<SystemResponses['deleteSystem']> => {
  //   try {
  //     await deleteSystem(params.id);
  //     return { status: 204, body: {id: params.id }};
  //   } catch (error) {
  //     return {
  //       status: 404,
  //       body: {
  //         status: 404,
  //         type: "https://api.conformance-test-suite.org/errors/not-found",
  //         title: "System Not Found",
  //         detail: error instanceof Error ? error.message : "Failed to delete system",
  //         instance: `/systems/${params.id}`,
  //       },
  //     };
  //   }
  // }
});