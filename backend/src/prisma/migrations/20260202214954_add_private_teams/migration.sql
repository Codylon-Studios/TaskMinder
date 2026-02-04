/*
  This migration (v2.3.0) adds private team feature, rm an unnecessary unique index and creates new indexes for sorting when getting data.
*/
-- AlterTable (add private teams)
ALTER TABLE "team" ADD COLUMN "inviteCode" TEXT,
ADD COLUMN "inviteCodeHash" TEXT,
ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;
-- CreateIndex (encrypted invite key should be unique)
CREATE UNIQUE INDEX "team_inviteCode_key" ON "team"("inviteCode");
-- CreateIndex (hashed invite keys should be unique)
CREATE UNIQUE INDEX "team_inviteCodeHash_key" ON "team"("inviteCodeHash");

-- DropIndex (since @id already covers unique)
DROP INDEX "account_account_id";

-- Create indexes to better cover sorted calls at get data functions and faster queries
-- CreateIndex
CREATE INDEX "event_teamId_idx" ON "event"("teamId");
-- CreateIndex
CREATE INDEX "event_classId_isPinned_startDate_idx" ON "event"("classId", "isPinned", "startDate");
-- CreateIndex
CREATE INDEX "homework_teamId_idx" ON "homework"("teamId");
-- CreateIndex
CREATE INDEX "homework_classId_isPinned_submissionDate_idx" ON "homework"("classId", "isPinned", "submissionDate");
-- CreateIndex
CREATE INDEX "lesson_teamId_idx" ON "lesson"("teamId");
-- CreateIndex
CREATE INDEX "upload_teamId_idx" ON "upload"("teamId");
-- CreateIndex
CREATE INDEX "upload_classId_teamId_createdAt_idx" ON "upload"("classId", "teamId", "createdAt");
-- CreateIndex
CREATE INDEX "upload_status_createdAt_idx" ON "upload"("status", "createdAt");
-- CreateIndex
CREATE INDEX "uploadRequest_teamId_idx" ON "uploadRequest"("teamId");
