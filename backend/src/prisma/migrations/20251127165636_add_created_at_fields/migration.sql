BEGIN;
-- Add BigInt fields to tables (class and uploads, etc. already have it) for better tracking
ALTER TABLE "account" ADD COLUMN "createdAt" BIGINT;
ALTER TABLE "event" ADD COLUMN "createdAt" BIGINT;
ALTER TABLE "eventType" ADD COLUMN "createdAt" BIGINT;
ALTER TABLE "homework" ADD COLUMN "createdAt" BIGINT;
ALTER TABLE "homeworkCheck" ADD COLUMN "createdAt" BIGINT;
ALTER TABLE "joinedClass" ADD COLUMN "createdAt" BIGINT;
ALTER TABLE "joinedTeams" ADD COLUMN "createdAt" BIGINT;
ALTER TABLE "lesson" ADD COLUMN "createdAt" BIGINT;
ALTER TABLE "subjects" ADD COLUMN "createdAt" BIGINT;
ALTER TABLE "team" ADD COLUMN "createdAt" BIGINT;
COMMIT;
