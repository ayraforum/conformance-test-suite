/*
  Warnings:

  - You are about to drop the column `resultsId` on the `TestRuns` table. All the data in the column will be lost.
  - You are about to drop the `ProfileResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TestRunResults` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProfileResult" DROP CONSTRAINT "ProfileResult_testResultsId_fkey";

-- DropForeignKey
ALTER TABLE "TestRuns" DROP CONSTRAINT "TestRuns_resultsId_fkey";

-- DropIndex
DROP INDEX "TestRuns_resultsId_key";

-- AlterTable
ALTER TABLE "TestRuns" DROP COLUMN "resultsId",
ADD COLUMN     "results" JSONB;

-- DropTable
DROP TABLE "ProfileResult";

-- DropTable
DROP TABLE "TestRunResults";
