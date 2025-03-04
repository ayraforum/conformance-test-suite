/*
  Warnings:

  - You are about to drop the column `conformance` on the `ProfileConfigurations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProfileConfigurations" DROP COLUMN "conformance",
ADD COLUMN     "conformant" BOOLEAN NOT NULL DEFAULT false;
