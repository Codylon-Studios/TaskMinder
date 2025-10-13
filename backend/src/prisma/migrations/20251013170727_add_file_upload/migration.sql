BEGIN; -- Start transaction

ALTER TABLE "public"."Class" 
ADD COLUMN "storageQuotaBytes" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "storageUsedBytes" BIGINT NOT NULL DEFAULT 0;

-- Update all existing rows
UPDATE "public"."Class"
SET "storageQuotaBytes" = CASE 
  WHEN "isTestClass" = true THEN 20971520 
  ELSE 5368709120 
END;

-- AlterTable
ALTER TABLE "public"."Class" ALTER COLUMN "storageQuotaBytes" DROP DEFAULT,
ALTER COLUMN "storageUsedBytes" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."FileData" (
    "fileId" SERIAL NOT NULL,
    "accountId" INTEGER,
    "classId" INTEGER NOT NULL,
    "fileGroupId" INTEGER,
    "originalName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "FileData_pkey" PRIMARY KEY ("fileId")
);

-- CreateTable
CREATE TABLE "public"."fileGroup" (
    "fileGroupId" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" BIGINT NOT NULL,
    "createdBy" INTEGER,

    CONSTRAINT "fileGroup_pkey" PRIMARY KEY ("fileGroupId")
);

-- CreateIndex
CREATE UNIQUE INDEX "fileGroup_classId_name_key" ON "public"."fileGroup"("classId", "name");

-- AddForeignKey
ALTER TABLE "public"."FileData" ADD CONSTRAINT "FileData_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."account"("accountId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."FileData" ADD CONSTRAINT "FileData_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."FileData" ADD CONSTRAINT "FileData_fileGroupId_fkey" FOREIGN KEY ("fileGroupId") REFERENCES "public"."fileGroup"("fileGroupId") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fileGroup" ADD CONSTRAINT "fileGroup_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("classId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fileGroup" ADD CONSTRAINT "fileGroup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."account"("accountId") ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT; -- End transaction
