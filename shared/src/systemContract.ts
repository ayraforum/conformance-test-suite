import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { ErrorResponseSchema } from './errorSchema';
import { PaginationRequestSchema, CollectionResponseSchema } from './paginationSchema';
import { ResourceResponseMetadataSchema } from './commonSchema';

extendZodWithOpenApi(z);

// Initialize the contract
const c = initContract();

// Modify SystemSchema to extend the base metadata
export const SystemSchema = z.object({
    id: z.string().uuid().openapi({ description: "The unique identifier for the system", example: "123e4567-e89b-12d3-a456-426614174000" }),
    name: z.string().min(2).max(255).openapi({ description: "The name of the system", example: "Example System" }),
    description: z.string().min(2).max(255).openapi({ description: "The description of the system", example: "Example System Description" }),
    version: z.string().min(2).max(255).openapi({ description: "The version of the system", example: "1.0.0" }),
    endpoint: z.string().min(2).max(255).url().openapi({ description: "The endpoint of the system", example: "https://example.com/api" }),
});

export const SystemCollectionSchema = CollectionResponseSchema.extend({
    contents: z.array(SystemSchema),
});

export const CreateSystemSchema = SystemSchema.omit({ id: true });
export const UpdateSystemSchema = SystemSchema.partial();

export const SystemResponseSchema = z.object({
    ...ResourceResponseMetadataSchema.shape,
    ...SystemSchema.shape,
});

export const IdParamSchema = z.object({
  id: z.string().uuid().openapi({ description: "The unique ID of the system." }),
});

export const DeleteResourceResponseSchema = z.object({
  id: z.string().uuid().openapi({ description: "System successfully deleted, the ID of the deleted system is returned." })
})

export type System = z.infer<typeof SystemSchema>;
export type SystemCollection = z.infer<typeof SystemCollectionSchema>;
export type CreateSystem = z.infer<typeof CreateSystemSchema>;
export type UpdateSystem = z.infer<typeof UpdateSystemSchema>;

// Create the contract
export const systemContract = c.router({
  getSystems: {
    method: "GET",
    path: "/systems",
    summary: "Get all systems",
    query: PaginationRequestSchema,
    description: "Get all systems with pagination",
    responses: {
      200: SystemCollectionSchema,
      400: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },
  getSystem: {
    method: "GET",
    path: "/systems/:id",
    summary: "Get single system by ID.",
    description: "Retrieve a single system by ID.",
    pathParams: IdParamSchema,
    responses: {
      200: SystemResponseSchema,
      404: ErrorResponseSchema
    },
  },
  createSystem: {
    method: "POST",
    path: "/systems",
    summary: "Create a new system.",
    description: "Create a new system with the provided data.",
    body: CreateSystemSchema,
    responses: {
      201: SystemResponseSchema,
      400: ErrorResponseSchema,
    },
  },
  updateSystem: {
    method: "PUT",
    path: "/systems/:id",
    summary: "Update a system.",
    description: "Update an existing system with the provided data.",
    pathParams: IdParamSchema,
    body: UpdateSystemSchema,
    responses: {
      200: SystemResponseSchema,
      400: ErrorResponseSchema,
      404: ErrorResponseSchema,
    },
  },
  deleteSystem: {
    method: "DELETE",
    path: "/systems/:id",
    summary: "Delete a system.",
    description: "Delete a system by ID.",
    pathParams: IdParamSchema,
    body: DeleteResourceResponseSchema,
    responses: {
      204: DeleteResourceResponseSchema,
      404: ErrorResponseSchema,
    },
  },
});
