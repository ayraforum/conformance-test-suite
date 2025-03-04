import { PrismaClient } from "@prisma/client";
import { CreateProfileConfigurationSchema, UpdateProfileConfigurationSchema } from "@conformance-test-suite/shared/src/profileConfigurationContract";

const prisma = new PrismaClient();

export async function getProfileConfigurations(systemId: string, offset: number, limit: number) {
    return prisma.profileConfigurations.findMany({
        where: { systemId },
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
    });
}

export async function getProfileConfigurationById(systemId: string, id: string) {
    return prisma.profileConfigurations.findFirst({
        where: {
            AND: [
                { id },
                { systemId }
            ]
        }
    });
}

export async function createProfileConfiguration(systemId: string, data: unknown) {
    const parsedData = CreateProfileConfigurationSchema.omit({ systemId: true }).parse(data);
    return prisma.profileConfigurations.create({
        data: {
            ...parsedData,
            systemId
        }
    });
}

export async function updateProfileConfiguration(systemId: string, id: string, data: unknown) {
    const parsedData = UpdateProfileConfigurationSchema.omit({ systemId: true }).parse(data);
    return prisma.profileConfigurations.update({
        where: {
            id,
            systemId
        },
        data: parsedData,
    });
}

export async function deleteProfileConfiguration(systemId: string, id: string) {
    return prisma.profileConfigurations.delete({
        where: {
            id,
            systemId
        }
    });
}