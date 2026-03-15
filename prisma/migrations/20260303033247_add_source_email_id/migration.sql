/*
  Warnings:

  - A unique constraint covering the columns `[sourceEmailId]` on the table `Application` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Application" ADD COLUMN "sourceEmailId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Application_sourceEmailId_key" ON "Application"("sourceEmailId");
