-- AlterTable
ALTER TABLE "class" ADD COLUMN "classCodeHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "class_classCodeHash_key" ON "class"("classCodeHash");
