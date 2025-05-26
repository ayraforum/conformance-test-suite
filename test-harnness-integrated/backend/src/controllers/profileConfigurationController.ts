import { ProfileConfigurationCollectionSchema, profileConfigurationContract, ProfileConfigurationSchema } from "@conformance-test-suite/shared/src/profileConfigurationContract";
import { initServer } from "@ts-rest/express";
import { ServerInferRequest, ServerInferResponses } from "@ts-rest/core";
import {
    getProfileConfigurations,
    getProfileConfigurationById,
    createProfileConfiguration,
    updateProfileConfiguration,
    deleteProfileConfiguration
} from "../services/profileConfigurationService";

export const s = initServer();

type ProfileConfigurationResponses = ServerInferResponses<typeof profileConfigurationContract>;
type GetProfileConfigurationsRequest = ServerInferRequest<typeof profileConfigurationContract.getProfileConfigurations>;
type GetProfileConfigurationRequest = ServerInferRequest<typeof profileConfigurationContract.getProfileConfiguration>;
type CreateProfileConfigurationRequest = ServerInferRequest<typeof profileConfigurationContract.createProfileConfiguration>;
type UpdateProfileConfigurationRequest = ServerInferRequest<typeof profileConfigurationContract.updateProfileConfiguration>;
type DeleteProfileConfigurationRequest = ServerInferRequest<typeof profileConfigurationContract.deleteProfileConfiguration>;

export const profileConfigurationController = s.router(profileConfigurationContract, {
    getProfileConfigurations: async ({ query, params }: GetProfileConfigurationsRequest): Promise<ProfileConfigurationResponses['getProfileConfigurations']> => {
        try {
            const offset = query.offset ?? 0;
            const limit = query.limit ?? 10;
            const configurations = await getProfileConfigurations(params.systemId, offset, limit);
            const baseUrl = "https://api.conformance-test-suite.org";

            const enrichedConfigurations = configurations.map((config) => ({
                ...config,
                kind: "ProfileConfiguration",
                self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${config.id}`
            }));

            const paginatedResponse = {
                contents: enrichedConfigurations,
                kind: "ProfileConfigurationsPage",
                self: `${baseUrl}/systems/${params.systemId}/profile-configurations?${new URLSearchParams({ offset: offset.toString(), limit: limit.toString() }).toString()}`,
                pageOf: "profile-configurations",
                next: configurations.length === limit ?
                    `${baseUrl}/systems/${params.systemId}/profile-configurations?${new URLSearchParams({ offset: (offset + limit).toString(), limit: limit.toString() }).toString()}` :
                    null,
                previous: offset > 0 ?
                    `${baseUrl}/systems/${params.systemId}/profile-configurations?${new URLSearchParams({ offset: Math.max(0, offset - limit).toString(), limit: limit.toString() }).toString()}` :
                    null
            };
            return { status: 200, body: ProfileConfigurationCollectionSchema.parse(paginatedResponse) };
        } catch (error) {
            return {
                status: 500,
                body: {
                    status: 500,
                    type: "https://api.conformance-test-suite.org/errors/internal-server-error",
                    title: "Internal Server Error",
                    detail: error instanceof Error ? error.message : "Failed to fetch profile configurations",
                    instance: `/systems/${params.systemId}/profile-configurations`,
                },
            };
        }
    },

    getProfileConfiguration: async ({ params }: GetProfileConfigurationRequest): Promise<ProfileConfigurationResponses['getProfileConfiguration']> => {
        try {
            const configuration = await getProfileConfigurationById(params.systemId, params.id);
            if (!configuration) {
                return {
                    status: 404,
                    body: {
                        status: 404,
                        type: "https://api.conformance-test-suite.org/errors/not-found",
                        title: "Profile Configuration Not Found",
                        detail: `Profile Configuration with ID ${params.id} could not be found`,
                        instance: `/systems/${params.systemId}/profile-configurations/${params.id}`,
                    },
                };
            }
            const baseUrl = "https://api.conformance-test-suite.org";
            return {
                status: 200,
                body: {
                    ...ProfileConfigurationSchema.parse(configuration),
                    kind: "ProfileConfiguration",
                    self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.id}`
                }
            };
        } catch (error) {
            return {
                status: 500,
                body: {
                    status: 500,
                    type: "https://api.conformance-test-suite.org/errors/internal-server-error",
                    title: "Internal Server Error",
                    detail: error instanceof Error ? error.message : "Failed to fetch profile configuration",
                    instance: `/systems/${params.systemId}/profile-configurations/${params.id}`,
                },
            };
        }
    },

    createProfileConfiguration: async ({ params, body }: CreateProfileConfigurationRequest): Promise<ProfileConfigurationResponses['createProfileConfiguration']> => {
        try {
            const newConfiguration = await createProfileConfiguration(params.systemId, body);
            const baseUrl = "https://api.conformance-test-suite.org";
            return {
                status: 201,
                body: {
                    ...ProfileConfigurationSchema.parse(newConfiguration),
                    kind: "ProfileConfiguration",
                    self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${newConfiguration.id}`
                }
            };
        } catch (error) {
            return {
                status: 400,
                body: {
                    status: 400,
                    type: "https://api.conformance-test-suite.org/errors/bad-request",
                    title: "Bad Request",
                    detail: error instanceof Error ? error.message : "Failed to create profile configuration",
                    instance: `/systems/${params.systemId}/profile-configurations`,
                },
            };
        }
    },

    updateProfileConfiguration: async ({ params, body }: UpdateProfileConfigurationRequest): Promise<ProfileConfigurationResponses['updateProfileConfiguration']> => {
        try {
            const updatedConfiguration = await updateProfileConfiguration(params.systemId, params.id, body);
            const baseUrl = "https://api.conformance-test-suite.org";
            return {
                status: 200,
                body: {
                    ...ProfileConfigurationSchema.parse(updatedConfiguration),
                    kind: "ProfileConfiguration",
                    self: `${baseUrl}/systems/${params.systemId}/profile-configurations/${params.id}`
                }
            };
        } catch (error) {
            return {
                status: 400,
                body: {
                    status: 400,
                    type: "https://api.conformance-test-suite.org/errors/bad-request",
                    title: "Bad Request",
                    detail: error instanceof Error ? error.message : "Failed to update profile configuration",
                    instance: `/systems/${params.systemId}/profile-configurations/${params.id}`,
                },
            };
        }
    },

    deleteProfileConfiguration: async ({ params }: DeleteProfileConfigurationRequest): Promise<ProfileConfigurationResponses['deleteProfileConfiguration']> => {
        try {
            await deleteProfileConfiguration(params.systemId, params.id);
            return { status: 204, body: { id: params.id } };
        } catch (error) {
            return {
                status: 404,
                body: {
                    status: 404,
                    type: "https://api.conformance-test-suite.org/errors/not-found",
                    title: "Profile Configuration Not Found",
                    detail: error instanceof Error ? error.message : "Failed to delete profile configuration",
                    instance: `/systems/${params.systemId}/profile-configurations/${params.id}`,
                },
            };
        }
    }
});