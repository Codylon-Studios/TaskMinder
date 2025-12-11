-- Rename classCreated to createdAt, match naming scheme
ALTER TABLE "class"
RENAME COLUMN "classCreated" to "createdAt";
-- add uploadDescription field to upload table
ALTER TABLE "upload" ADD COLUMN "uploadDescription" TEXT;