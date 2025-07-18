-- DropForeignKey
ALTER TABLE "homework10d" DROP CONSTRAINT "homework10d_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "homework10dCheck" DROP CONSTRAINT "homework10dCheck_accountId_fkey";

-- DropForeignKey
ALTER TABLE "homework10dCheck" DROP CONSTRAINT "homework10dCheck_homeworkId_fkey";

-- RenameTable
ALTER TABLE "homework10d" RENAME TO "homework";

-- RenameTable
ALTER TABLE "homework10dCheck" RENAME TO "homeworkCheck";

-- CreateIndex
CREATE UNIQUE INDEX "homework_check_account_id_homework_id" ON "homeworkCheck"("accountId", "homeworkId");

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("subjectId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "homeworkCheck" ADD CONSTRAINT "homeworkCheck_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "homeworkCheck" ADD CONSTRAINT "homeworkCheck_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homework"("homeworkId") ON DELETE CASCADE ON UPDATE NO ACTION;
