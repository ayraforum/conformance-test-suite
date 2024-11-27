/*
  Warnings:

  - You are about to drop the column `results` on the `TestRuns` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[resultsId]` on the table `TestRuns` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TestRuns" DROP COLUMN "results",
ADD COLUMN     "resultsId" TEXT;

-- CreateTable
CREATE TABLE "TestRunResults" (
    "id" TEXT NOT NULL,
    "conformantProfiles" TEXT[],
    "isConformant" BOOLEAN NOT NULL,

    CONSTRAINT "TestRunResults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileResult" (
    "id" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "passedTests" JSONB NOT NULL,
    "failedTests" JSONB NOT NULL,
    "testResultsId" TEXT NOT NULL,

    CONSTRAINT "ProfileResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestRuns_resultsId_key" ON "TestRuns"("resultsId");

-- AddForeignKey
ALTER TABLE "ProfileResult" ADD CONSTRAINT "ProfileResult_testResultsId_fkey" FOREIGN KEY ("testResultsId") REFERENCES "TestRunResults"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRuns" ADD CONSTRAINT "TestRuns_resultsId_fkey" FOREIGN KEY ("resultsId") REFERENCES "TestRunResults"("id") ON DELETE SET NULL ON UPDATE CASCADE;
