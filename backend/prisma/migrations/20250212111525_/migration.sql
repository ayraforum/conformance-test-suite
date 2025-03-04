/*
  Warnings:

  - You are about to drop the column `endpoint` on the `Systems` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProfileConfigurations" ADD COLUMN     "endpoint" TEXT NOT NULL DEFAULT 'localhost:8443';

-- AlterTable
ALTER TABLE "Systems" DROP COLUMN "endpoint";
