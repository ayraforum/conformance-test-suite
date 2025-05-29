import { PrismaClient } from "@prisma/client";
import { CreateSystemSchema, UpdateSystemSchema } from "@conformance-test-suite/shared/src/systemContract";

const prisma = new PrismaClient();

export async function getSystems(offset: number, limit: number) {
    return prisma.systems.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
    });
}

export async function getSystemById(id: string) {
    return prisma.systems.findUnique({ where: { id } });
}

export async function createSystem(data: unknown) {
    const parsedData = CreateSystemSchema.parse(data);
    return prisma.systems.create({ data: parsedData });
}

export async function updateSystem(id: string, data: unknown) {
    const parsedData = UpdateSystemSchema.parse(data);
    return prisma.systems.update({
        where: { id },
        data: parsedData,
    });
}

export async function deleteSystem(id: string) {
    return prisma.systems.delete({ where: { id } });
}
