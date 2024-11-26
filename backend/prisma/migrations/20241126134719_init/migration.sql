-- CreateTable
CREATE TABLE "TestRuns" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "TestRuns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRunHistories" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "testRunId" TEXT NOT NULL,
    "logs" TEXT[],
    "jsonReport" JSONB,
    "state" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "TestRunHistories_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Profiles" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Profiles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TestRuns" ADD CONSTRAINT "TestRuns_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRuns" ADD CONSTRAINT "TestRuns_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "Systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRunHistories" ADD CONSTRAINT "TestRunHistories_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRuns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
