-- AlterTable
ALTER TABLE "public"."Class" ADD COLUMN     "deletedAt" BIGINT;

-- AlterTable
ALTER TABLE "public"."event" ADD COLUMN     "deletedAt" BIGINT;

-- AlterTable
ALTER TABLE "public"."eventType" ADD COLUMN     "deletedAt" BIGINT;

-- AlterTable
ALTER TABLE "public"."homework" ADD COLUMN     "deletedAt" BIGINT;

-- AlterTable
ALTER TABLE "public"."subjects" ADD COLUMN     "deletedAt" BIGINT;

-- AlterTable
ALTER TABLE "public"."team" ADD COLUMN     "deletedAt" BIGINT;

-- AlterTable
ALTER TABLE "public"."lesson" ADD COLUMN     "deletedAt" BIGINT;
