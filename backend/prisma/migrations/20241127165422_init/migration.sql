-- AlterTable
ALTER TABLE "TestRuns" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "results" JSONB;
