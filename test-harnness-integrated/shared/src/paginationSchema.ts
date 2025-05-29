import { z } from "zod";
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { ResourceResponseMetadataSchema } from "./commonSchema";

extendZodWithOpenApi(z);

export const PaginationRequestSchema = z.object({
  offset: z
    .string()
    .optional() // Mark field as optional
    .transform((value) => (value !== undefined ? parseInt(value, 10) : undefined)) // Handle undefined
    .refine((value) => value === undefined || !isNaN(value), {
      message: "Offset must be a valid number",
    })
    .pipe(z.number().int().optional()), // Ensure it's a number and integer, retain optional
  limit: z
    .string()
    .optional()
    .transform((value) => (value !== undefined ? parseInt(value, 10) : undefined))
    .refine((value) => value === undefined || !isNaN(value), {
      message: "Limit must be a valid number",
    })
    .pipe(z.number().int().optional()),
});

// Define a base schema for collection responses
const PaginationMetadataSchema = z.object({
  ...ResourceResponseMetadataSchema.shape,
  pageOf: z
    .string()
    .openapi({ description: "A string field indicating the type of resource that the contents field contains." }),
  next: z
    .string()
    .nullable()
    .openapi({
      description:
        "Optional URL for the next page of results. If there are no further results, this will be null.",
      example: "/systems?offset=200&limit=10",
    }),
  previous: z
    .string()
    .nullable()
    .openapi({
      description:
        "Optional URL for the previous page of results. If this is the first page, this will be null.",
      example: "/systems?offset=0&limit=10",
    }),
});

// Define the collection wrapper
export const CollectionResponseSchema = z.object({
  contents: z
    .array(z.any())
    .openapi({ description: "An array of resources representing the collection contents." }),
  ...PaginationMetadataSchema.shape, // Spread in the pagination metadata
});

// // Export the schema
// export const OpenApiCollectionSchema = CollectionResponseSchema.openapi({
//   description: "A common response format for paginated collections.",
//   example: {
//     contents: [],
//     kind: "SystemsPage",
//     self: "/systems?offset=0&limit=10",
//     pageOf: "systems",
//     next: "/systems?offset=10&limit=10",
//     previous: null,
//   },
// });
