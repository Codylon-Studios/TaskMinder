-- AlterTable
ALTER TABLE "event" ADD COLUMN "accountId" INTEGER;

-- AlterTable
ALTER TABLE "homework" ADD COLUMN "accountId" INTEGER;

-- CreateIndex
CREATE INDEX "event_classId_accountId_idx" ON "event"("classId", "accountId");

-- CreateIndex
CREATE INDEX "homework_classId_accountId_idx" ON "homework"("classId", "accountId");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE CASCADE ON UPDATE NO ACTION;
