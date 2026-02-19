-- DropIndex
DROP INDEX "account_account_id";

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
