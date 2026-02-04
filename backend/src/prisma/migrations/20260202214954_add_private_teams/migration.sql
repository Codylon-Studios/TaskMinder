/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `team` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inviteCodeHash]` on the table `team` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "team" ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "inviteCodeHash" TEXT,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "team_inviteCode_key" ON "team"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "team_inviteCodeHash_key" ON "team"("inviteCodeHash");
