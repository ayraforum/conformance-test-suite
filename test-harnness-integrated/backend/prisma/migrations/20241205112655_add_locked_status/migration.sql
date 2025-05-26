-- AlterTable
ALTER TABLE "ProfileConfigurations" ADD COLUMN     "conformance" TEXT,
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false;
