BEGIN;

-- Delete previously empty (default) class if new setup (at v2.0.0)
DELETE FROM "public"."Class"
WHERE "className" = 'CLASS_NAME'
  AND "classCode" = 'CLASS_CODE'
  AND "classCreated" = 1754484031375;

-- Add new columns with DEFAULT values so migration works even if rows already exist
ALTER TABLE "public"."Class" 
ADD COLUMN "storageQuotaBytes" BIGINT DEFAULT 0 NOT NULL,
ADD COLUMN "storageUsedBytes" BIGINT DEFAULT 0 NOT NULL;

-- Update existing class rows depending on isTestClass
UPDATE "public"."Class"
SET "storageQuotaBytes" = 
  CASE 
    WHEN "isTestClass" = TRUE THEN 20 * 1024 * 1024      -- 20 MB in bytes
    ELSE 1 * 1024 * 1024 * 1024                          -- 1 GB in bytes
  END;


ALTER TABLE "public"."Class" 
ALTER COLUMN "storageQuotaBytes" DROP DEFAULT,
ALTER COLUMN "storageUsedBytes" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."fileMetadata" (
    "fileMetaDataId" SERIAL NOT NULL,
    "uploadId" INTEGER NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "fileMetadata_pkey" PRIMARY KEY ("fileMetaDataId")
);

-- CreateTable
CREATE TABLE "public"."upload" (
    "uploadId" SERIAL NOT NULL,
    "uploadName" TEXT NOT NULL,
    "uploadType" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "classId" INTEGER NOT NULL,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "upload_pkey" PRIMARY KEY ("uploadId")
);

-- AlterTable
ALTER TABLE "upload" ADD COLUMN "reservedBytes" BIGINT NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "public"."fileMetadata" 
ADD CONSTRAINT "fileMetadata_uploadId_fkey" 
FOREIGN KEY ("uploadId") REFERENCES "public"."upload"("uploadId") 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."upload" 
ADD CONSTRAINT "upload_accountId_fkey" 
FOREIGN KEY ("accountId") REFERENCES "public"."account"("accountId") 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."upload" 
ADD CONSTRAINT "upload_classId_fkey" 
FOREIGN KEY ("classId") REFERENCES "public"."Class"("classId") 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."upload" 
ADD CONSTRAINT "upload_teamId_fkey" 
FOREIGN KEY ("teamId") REFERENCES "public"."team"("teamId") 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AlterTable
ALTER TABLE "public"."upload" ADD COLUMN "errorReason" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'queued';

COMMIT;
