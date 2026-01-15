/*
  Warnings:

  - Made the column `isPinned` on table `event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isPinned` on table `homework` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "event" ALTER COLUMN "isPinned" SET NOT NULL;

-- AlterTable
ALTER TABLE "homework" ALTER COLUMN "isPinned" SET NOT NULL;

-- CreateTable
CREATE TABLE "uploadRequest" (
    "uploadRequestId" SERIAL NOT NULL,
    "uploadRequestName" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "uploadRequest_pkey" PRIMARY KEY ("uploadRequestId")
);

-- CreateIndex
CREATE INDEX "uploadRequest_classId_idx" ON "uploadRequest"("classId");

-- AddForeignKey
ALTER TABLE "uploadRequest" ADD CONSTRAINT "uploadRequest_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;
