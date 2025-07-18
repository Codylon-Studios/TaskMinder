/*
FINAL MIGRATION: V1 → V2

This migration introduces significant structural changes, including support for multiple classes
(as opposed to the single-class structure in previous versions). 
As such, transitioning from an earlier migration requires MANUAL STEPS before this migration can be applied successfully.

> Important: This migration WILL NOT WORK OUT OF THE BOX without modification.
> For detailed instructions, please refer to the official V1 → V2 migration guide (https://docs.taskminder.de).

Backup Warning

Please ensure you back up your database before proceeding, especially if a previous migration attempt has failed.

Required Steps

1. Define Your Classes
   The database schema now expects multiple classes.
   Update the relevant `INSERT` statements in this migration file with values specific to your setup.
   Update the relevant `UPDATE` statements in this migration file with values specific to your setup.

2. Manual Adjustments Required
   Review and modify any part of this migration file that assumes default values or a single-class structure.
*/

-- CreateTable
CREATE TABLE "Class" (
    "classId" SERIAL NOT NULL,
    "className" TEXT NOT NULL,
    "classCode" TEXT NOT NULL,
    "classCreated" BIGINT NOT NULL,
    "isTestClass" BOOLEAN NOT NULL,
    "dsbMobileActivated" BOOLEAN NOT NULL,
    "dsbMobileUser" TEXT,
    "dsbMobilePassword" TEXT,
    "dsbMobileClass" TEXT,
    "permissionDefaultSetting" INTEGER NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("classId")
);

-- UPDATE THESE VALUES
-- You MUST ensure the 'Class' table is empty and its sequence is reset before running this script to guarantee the new class gets an ID of 1.
INSERT INTO "Class" ("className", "classCode", "classCreated", "isTestClass", "dsbMobileActivated", "dsbMobileUser", "dsbMobilePassword", "dsbMobileClass", "permissionDefaultSetting")
VALUES ('YOUR_CLASS_NAME', 'YOUR_CLASS_CODE', 1735689600000, false, true, 'DSB_MOBILE_USER', 'DSB_MOBILE_PASSWORD', 'DSB_MOBILE_CLASS_NAME', 0);

-- AlterTable
ALTER TABLE "event" ADD COLUMN "classId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "eventType" ADD COLUMN "classId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "homework" RENAME CONSTRAINT "homework10d_pkey" TO "homework_pkey";
ALTER TABLE "homework" ADD COLUMN "classId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "homeworkCheck" RENAME CONSTRAINT "homework10dCheck_pkey" TO "homeworkCheck_pkey";

-- AlterTable
ALTER TABLE "joinedClass" ADD COLUMN "classId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "lesson" ADD COLUMN "classId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN "classId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "team" ADD COLUMN "classId" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE IF EXISTS "timetable";

-- CreateIndex
CREATE UNIQUE INDEX "Class_className_key" ON "Class"("className");

-- CreateIndex
CREATE UNIQUE INDEX "Class_classCode_key" ON "Class"("classCode");

-- CreateIndex
CREATE UNIQUE INDEX "eventType_classId_name_key" ON "eventType"("classId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_classId_teamId_weekDay_lessonNumber_key" ON "lesson"("classId", "teamId", "weekDay", "lessonNumber", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_classId_subjectNameLong_key" ON "subjects"("classId", "subjectNameLong");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_classId_subjectNameShort_key" ON "subjects"("classId", "subjectNameShort");

-- CreateIndex
CREATE UNIQUE INDEX "team_classId_name_key" ON "team"("classId", "name");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("classId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventType" ADD CONSTRAINT "eventType_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("classId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("classId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joinedClass" ADD CONSTRAINT "joinedClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("classId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("classId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("classId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("classId") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "account" ADD COLUMN "permissionSetting" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "account" ALTER COLUMN "permissionSetting" DROP NOT NULL;

-- UPDATE THESE VALUES
-- sets one admin for the previous single class
UPDATE "account" SET "permissionSetting" = 3 WHERE "username" = 'YOUR_USERNAME';
ALTER TABLE "account" DROP COLUMN "isAdmin";

ALTER TABLE "account" ALTER COLUMN "permissionSetting" DROP DEFAULT;

-- AlterTable
ALTER TABLE "event" ALTER COLUMN "classId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "eventType" ALTER COLUMN "classId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "homework" ALTER COLUMN "classId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "joinedClass" ALTER COLUMN "classId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lesson" ALTER COLUMN "classId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "subjects" ALTER COLUMN "classId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "team" ALTER COLUMN "classId" DROP DEFAULT;

-- CreateTable
CREATE TABLE "deletedAccount" (
    "deletedAccountId" SERIAL NOT NULL,
    "deletedUsername" TEXT NOT NULL,
    "deletedPassword" TEXT NOT NULL,
    "deletedOn" BIGINT NOT NULL,

    CONSTRAINT "deletedAccount_pkey" PRIMARY KEY ("deletedAccountId")
);

/*
OPTIONAL CMDS
The following commands are optional and may or may not be required, depending on your setup.
*/
-- DropIndex
DROP INDEX IF EXISTS "homework10dCheck_accountId_key";
-- DropIndex
DROP INDEX IF EXISTS "homework10d_check_account_id_homework_id";

