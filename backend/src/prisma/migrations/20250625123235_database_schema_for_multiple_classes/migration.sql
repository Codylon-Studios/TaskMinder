/*
  Warnings:

  - You are about to drop the `timetable` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[classId,name]` on the table `eventType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[classId,teamId,weekDay,lessonNumber]` on the table `lesson` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[classId,subjectNameLong]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[classId,subjectNameShort]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[classId,name]` on the table `team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `classId` to the `event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `eventType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `homework` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `joinedClass` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `lesson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `subjects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `team` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "homework10dCheck_accountId_key";

-- DropIndex
DROP INDEX "homeworkCheck_accountId_key";

-- AlterTable
ALTER TABLE "event" ADD COLUMN "classId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "eventType" ADD COLUMN "classId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "homework" RENAME CONSTRAINT "homework10d_pkey" TO "homework_pkey";
ALTER TABLE "homework" ADD COLUMN "classId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "homeworkCheck" RENAME CONSTRAINT "homework10dCheck_pkey" TO "homeworkCheck_pkey";

-- AlterTable
ALTER TABLE "joinedClass" ADD COLUMN "classId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "lesson" ADD COLUMN "classId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN "classId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "team" ADD COLUMN "classId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "timetable";

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

    CONSTRAINT "Class_pkey" PRIMARY KEY ("classId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Class_className_key" ON "Class"("className");

-- CreateIndex
CREATE UNIQUE INDEX "Class_classCode_key" ON "Class"("classCode");

-- CreateIndex
CREATE UNIQUE INDEX "eventType_classId_name_key" ON "eventType"("classId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_classId_teamId_weekDay_lessonNumber_key" ON "lesson"("classId", "teamId", "weekDay", "lessonNumber");

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
