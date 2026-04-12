BEGIN;

-- DropIndex for redundant accountid
DROP INDEX "account_account_id";
-- create indexes for faster queries
CREATE INDEX "event_teamId_idx" ON "event"("teamId");
CREATE INDEX "event_classId_isPinned_startDate_idx" ON "event"("classId", "isPinned", "startDate");
CREATE INDEX "homework_teamId_idx" ON "homework"("teamId");
CREATE INDEX "homework_classId_isPinned_submissionDate_idx" ON "homework"("classId", "isPinned", "submissionDate");
CREATE INDEX "lesson_teamId_idx" ON "lesson"("teamId");
CREATE INDEX "upload_teamId_idx" ON "upload"("teamId");
CREATE INDEX "upload_classId_teamId_createdAt_idx" ON "upload"("classId", "teamId", "createdAt");
CREATE INDEX "upload_status_createdAt_idx" ON "upload"("status", "createdAt");
CREATE INDEX "uploadRequest_teamId_idx" ON "uploadRequest"("teamId");
CREATE INDEX "fileMetadata_uploadId_idx" ON "fileMetadata"("uploadId");
CREATE INDEX "subjects_classId_idx" ON "subjects"("classId");
CREATE INDEX "event_startDate_classId_idx" ON "event"("startDate", "classId");
CREATE INDEX "class_isTestClass_createdAt_idx" ON "class"("isTestClass", "createdAt");
CREATE INDEX "homework_submissionDate_classId_idx" ON "homework"("submissionDate", "classId");
CREATE INDEX "upload_classId_isPinned_createdAt_uploadName_uploadId_idx" ON "upload"("classId", "isPinned" DESC, "createdAt" DESC, "uploadName", "uploadId" DESC);

COMMIT;