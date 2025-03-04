/*
  Warnings:

  - The `conformance` column on the `ProfileConfigurations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ProfileConfigurations" DROP COLUMN "conformance",
ADD COLUMN     "conformance" BOOLEAN NOT NULL DEFAULT false;
