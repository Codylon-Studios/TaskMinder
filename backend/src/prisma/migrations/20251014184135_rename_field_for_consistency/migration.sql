/*
  Warnings:

  - You are about to drop the column `createdBy` on the `fileGroup` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."fileGroup" DROP CONSTRAINT "fileGroup_createdBy_fkey";

-- DropIndex
DROP INDEX "public"."fileGroup_classId_name_key";

-- AlterTable
ALTER TABLE "public"."fileGroup" DROP COLUMN "createdBy",
ADD COLUMN "accountId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."fileGroup" ADD CONSTRAINT "fileGroup_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."account"("accountId") ON DELETE SET NULL ON UPDATE NO ACTION;
