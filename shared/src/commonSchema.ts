import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { ErrorResponseSchema } from './errorSchema';
import { PaginationRequestSchema,CollectionResponseSchema } from './paginationSchema';

extendZodWithOpenApi(z);

// Initialize the contract
const c = initContract();

// Add a base schema for common metadata properties
export const ResourceResponseMetadataSchema = z.object({
    kind: z.string().openapi({ description: "The type of resource", example: "System" }),
    self: z.string().url().openapi({ description: "The URL identifying this resource", example: "/systems/123e4567-e89b-12d3-a456-426614174000" }),
});

export const IdParamSchema = z.object({
    id: z.string().uuid().openapi({ description: "The unique ID of the profile configuration." }),
});

export const DeleteResourceResponseSchema = z.object({
    id: z.string().uuid().openapi({ description: "Profile configuration successfully deleted, the ID of the deleted configuration is returned." })
});
