BEGIN;

-- Drop table deletedAccount - just reset (delete) it
DROP TABLE "deletedAccount";

-- Use account and deletedAt instead
ALTER TABLE "account" ADD COLUMN "deletedAt" BIGINT;

-- Rename Class to class table
ALTER TABLE "Class" RENAME TO "class";
-- Rename primary key of class table
ALTER TABLE "class" RENAME CONSTRAINT "Class_pkey" TO "class_pkey";

-- Create (unique) indexes for faster querying
CREATE UNIQUE INDEX IF NOT EXISTS "class_classCode_key" ON "class"("classCode");
CREATE UNIQUE INDEX IF NOT EXISTS "fileMetadata_storedFileName_key" ON "fileMetadata"("storedFileName");

-- Create standard performance indexes (IF NOT EXISTS ensures idempotency)
CREATE INDEX IF NOT EXISTS "account_deletedAt_idx" ON "account"("deletedAt");
CREATE INDEX IF NOT EXISTS "event_classId_idx" ON "event"("classId");
CREATE INDEX IF NOT EXISTS "homework_classId_idx" ON "homework"("classId");
CREATE INDEX IF NOT EXISTS "homeworkCheck_accountId_idx" ON "homeworkCheck"("accountId");
CREATE INDEX IF NOT EXISTS "joinedClass_classId_idx" ON "joinedClass"("classId");
CREATE INDEX IF NOT EXISTS "joinedTeams_accountId_idx" ON "joinedTeams"("accountId");
CREATE INDEX IF NOT EXISTS "lesson_classId_idx" ON "lesson"("classId");
CREATE INDEX IF NOT EXISTS "team_classId_idx" ON "team"("classId");
CREATE INDEX IF NOT EXISTS "upload_classId_idx" ON "upload"("classId");

-- Drop the constraint and index (because of deletedAt)
ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_username_key";
ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "subjects_classId_subjectNameLong_key";
ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "subjects_classId_subjectNameShort_key";

DROP INDEX IF EXISTS "subjects_classId_subjectNameLong_key";
DROP INDEX IF EXISTS "subjects_classId_subjectNameShort_key";

-- CLEANUP SCRIPT: REMOVE ALL DUPLICATE INDICES/CONSTRAINTS
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Find and Drop all CONSTRAINTS starting with 'account_username_key'
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'account' 
        AND constraint_name LIKE 'account_username_key%'
    ) LOOP 
        RAISE NOTICE 'Dropping constraint: %', r.constraint_name;
        EXECUTE 'ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '" CASCADE'; 
    END LOOP;

    -- Find and Drop all INDICES starting with 'account_username_key' (cleanup leftovers)
    FOR r IN (
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'account' 
        AND indexname LIKE 'account_username_key%'
    ) LOOP 
        RAISE NOTICE 'Dropping index: %', r.indexname;
        EXECUTE 'DROP INDEX IF EXISTS "' || r.indexname || '"'; 
    END LOOP;
END $$;

-- Only enforce uniqueness for non-deleted accounts
-- This is a "Partial Index"
CREATE UNIQUE INDEX "account_username_unique_active_key" 
  ON "account"("username") 
  WHERE "deletedAt" IS NULL;

-- Alter foreign keys to make update to no action and all delete to cascade 
-- (except upload where not logged in user can upload files: delete -> setnull)
-- Drop existing constraints
ALTER TABLE "event" DROP CONSTRAINT IF EXISTS "event_classId_fkey";
ALTER TABLE "event" DROP CONSTRAINT IF EXISTS "event_eventTypeId_fkey";
ALTER TABLE "eventType" DROP CONSTRAINT IF EXISTS "eventType_classId_fkey";
ALTER TABLE "homework" DROP CONSTRAINT IF EXISTS "homework_classId_fkey";
ALTER TABLE "homeworkCheck" DROP CONSTRAINT IF EXISTS "homeworkCheck_accountId_fkey";
ALTER TABLE "homeworkCheck" DROP CONSTRAINT IF EXISTS "homeworkCheck_homeworkId_fkey";
ALTER TABLE "joinedClass" DROP CONSTRAINT IF EXISTS "joinedClass_classId_fkey";
ALTER TABLE "joinedClass" DROP CONSTRAINT IF EXISTS "joinedClass_accountId_fkey";
ALTER TABLE "joinedTeams" DROP CONSTRAINT IF EXISTS "joinedTeams_teamId_fkey";
ALTER TABLE "joinedTeams" DROP CONSTRAINT IF EXISTS "joinedTeams_accountId_fkey";
ALTER TABLE "lesson" DROP CONSTRAINT IF EXISTS "lesson_classId_fkey";
ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "subjects_classId_fkey";
ALTER TABLE "team" DROP CONSTRAINT IF EXISTS "team_classId_fkey";
ALTER TABLE "fileMetadata" DROP CONSTRAINT IF EXISTS "fileMetadata_uploadId_fkey";
ALTER TABLE "upload" DROP CONSTRAINT IF EXISTS "upload_accountId_fkey";
ALTER TABLE "upload" DROP CONSTRAINT IF EXISTS "upload_classId_fkey";

-- Recreate constraints
-- EVENT
ALTER TABLE "event" ADD CONSTRAINT "event_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "event" ADD CONSTRAINT "event_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "eventType"("eventTypeId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- EVENT TYPE
ALTER TABLE "eventType" ADD CONSTRAINT "eventType_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- HOMEWORK
ALTER TABLE "homework" ADD CONSTRAINT "homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- HOMEWORK CHECK
ALTER TABLE "homeworkCheck" ADD CONSTRAINT "homeworkCheck_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "homeworkCheck" ADD CONSTRAINT "homeworkCheck_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homework"("homeworkId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- JOINED CLASS
ALTER TABLE "joinedClass" ADD CONSTRAINT "joinedClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "joinedClass" ADD CONSTRAINT "joinedClass_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- JOINED TEAMS
ALTER TABLE "joinedTeams" ADD CONSTRAINT "joinedTeams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("teamId") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "joinedTeams" ADD CONSTRAINT "joinedTeams_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- LESSON
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- SUBJECTS
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- TEAM
ALTER TABLE "team" ADD CONSTRAINT "team_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- FILE METADATA
ALTER TABLE "fileMetadata" ADD CONSTRAINT "fileMetadata_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "upload"("uploadId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- UPLOAD (accountId is SET NULL)
ALTER TABLE "upload" ADD CONSTRAINT "upload_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "upload" ADD CONSTRAINT "upload_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT;