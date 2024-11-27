-- CreateTable
CREATE TABLE "TestRuns" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileConfigurationId" TEXT NOT NULL,
    "logs" TEXT[],
    "jsonReport" JSONB,
    "state" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "TestRuns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Systems" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "Systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileConfigurations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,

    CONSTRAINT "ProfileConfigurations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TestRuns" ADD CONSTRAINT "TestRuns_profileConfigurationId_fkey" FOREIGN KEY ("profileConfigurationId") REFERENCES "ProfileConfigurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileConfigurations" ADD CONSTRAINT "ProfileConfigurations_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "Systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
