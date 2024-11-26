import { z } from "zod";
import { extendZodWithOpenApi } from '@anatine/zod-openapi';

extendZodWithOpenApi(z);

// Define a reusable error response schema
export const ErrorResponseSchema = z.object({
  status: z
    .number()
    .int()
    .openapi({
      description: "The HTTP status code for this occurrence of the problem.",
      example: 400,
    }),
  type: z
    .string()
    .url()
    .openapi({
      description: "A URI reference that identifies the problem type.",
      example: "https://example.org/doc/model-MalformedEmail/",
    }),
  title: z
    .string()
    .openapi({
      description:
        "A short, human-readable summary of the problem. It does not change from occurrence to occurrence of the problem.",
      example: "Malformed email",
    }),
  detail: z
    .string()
    .openapi({
      description:
        "A human-readable explanation specific to this occurrence of the problem.",
      example: "The received '{[}@]e[].b}' email does not conform to the required format.",
    }),
  instance: z
    .string()
    .url()
    .openapi({
      description:
        "A URI reference that identifies the specific occurrence of the problem.",
      example: "https://example.org/errors/12345",
    }),
});
