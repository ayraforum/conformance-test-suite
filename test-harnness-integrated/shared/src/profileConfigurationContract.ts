import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { ErrorResponseSchema } from './errorSchema';
import { PaginationRequestSchema, CollectionResponseSchema } from './paginationSchema';
import { ResourceResponseMetadataSchema } from './commonSchema';
import { DeleteResourceResponseSchema } from './commonSchema';

extendZodWithOpenApi(z);

const c = initContract();

export enum ProfileConfigurationType {
    API = "api",
    MESSAGE = "message",
}

export enum Role {
    ISSUER = "issuer",
    PROVER = "prover",
    VERIFIER = "verifier"
}

export const ProfileConfigurationSchema = z.object({
    id: z.string().uuid().openapi({ description: "The unique identifier for the profile configuration", example: "123e4567-e89b-12d3-a456-426614174000" }),
    name: z.string().min(2).max(255).openapi({ description: "The name of the profile configuration", example: "Production Profile" }),
    description: z.string().min(2).max(255).openapi({ description: "The description of the profile configuration", example: "Configuration for production environment" }),
    systemId: z.string().uuid().openapi({ description: "The ID of the associated system", example: "123e4567-e89b-12d3-a456-426614174000" }),
    configuration: z.any().optional().openapi({ description: "The JSON configuration data" }),
    type: z.nativeEnum(ProfileConfigurationType).openapi({ description: "The type of the profile configuration", example: "api" }),
    conformant: z.boolean().default(false).openapi({ description: "The conformance status of the profile configuration", example: true }),
    locked: z.boolean().default(false).openapi({ description: "Whether the profile configuration is locked", example: false }),
    endpoint: z.string().min(2).max(255).url().openapi({ description: "The endpoint of the system", example: "https://example.com/api" }),
    role: z.nativeEnum(Role).openapi({ description: "The role to assume for testing this profile configuration", example: "issuer" }),
});

export const ProfileConfigurationCollectionSchema = CollectionResponseSchema.extend({
    contents: z.array(ProfileConfigurationSchema),
});

export const CreateProfileConfigurationSchema = ProfileConfigurationSchema.omit({ id: true });
export const UpdateProfileConfigurationSchema = ProfileConfigurationSchema.partial();

export const ProfileConfigurationResponseSchema = z.object({
    ...ResourceResponseMetadataSchema.shape,
    ...ProfileConfigurationSchema.shape,
});

export type ProfileConfiguration = z.infer<typeof ProfileConfigurationSchema>;
export type ProfileConfigurationCollection = z.infer<typeof ProfileConfigurationCollectionSchema>;
export type CreateProfileConfiguration = z.infer<typeof CreateProfileConfigurationSchema>;
export type UpdateProfileConfiguration = z.infer<typeof UpdateProfileConfigurationSchema>;

export const profileConfigurationContract = c.router({
    getProfileConfigurations: {
        method: "GET",
        path: "/systems/:systemId/profile-configurations",
        summary: "Get all profile configurations for a system",
        query: PaginationRequestSchema,
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" })
        }),
        description: "Get all profile configurations for a specific system with pagination",
        responses: {
            200: ProfileConfigurationCollectionSchema,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
    },
    getProfileConfiguration: {
        method: "GET",
        path: "/systems/:systemId/profile-configurations/:id",
        summary: "Get single profile configuration by ID",
        description: "Retrieve a single profile configuration by ID for a specific system",
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" }),
            id: z.string().uuid().openapi({ description: "The ID of the profile configuration" })
        }),
        responses: {
            200: ProfileConfigurationResponseSchema,
            404: ErrorResponseSchema
        },
    },
    createProfileConfiguration: {
        method: "POST",
        path: "/systems/:systemId/profile-configurations",
        summary: "Create a new profile configuration",
        description: "Create a new profile configuration for a specific system",
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" })
        }),
        body: CreateProfileConfigurationSchema.omit({ systemId: true }),
        responses: {
            201: ProfileConfigurationResponseSchema,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema,
        },
    },
    updateProfileConfiguration: {
        method: "PUT",
        path: "/systems/:systemId/profile-configurations/:id",
        summary: "Update a profile configuration",
        description: "Update an existing profile configuration for a specific system",
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" }),
            id: z.string().uuid().openapi({ description: "The ID of the profile configuration" })
        }),
        body: UpdateProfileConfigurationSchema.omit({ systemId: true }),
        responses: {
            200: ProfileConfigurationResponseSchema,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema,
        },
    },
    deleteProfileConfiguration: {
        method: "DELETE",
        path: "/systems/:systemId/profile-configurations/:id",
        summary: "Delete a profile configuration",
        description: "Delete a profile configuration for a specific system",
        pathParams: z.object({
            systemId: z.string().uuid().openapi({ description: "The ID of the system" }),
            id: z.string().uuid().openapi({ description: "The ID of the profile configuration" })
        }),
        body: DeleteResourceResponseSchema,
        responses: {
            204: DeleteResourceResponseSchema,
            404: ErrorResponseSchema,
        },
    },
});