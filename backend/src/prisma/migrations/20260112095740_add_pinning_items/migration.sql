-- add isPinned field to homework table
ALTER TABLE "homework" ADD COLUMN "isPinned" BOOLEAN DEFAULT FALSE;
-- add isPinned field to event table
ALTER TABLE "event" ADD COLUMN "isPinned" BOOLEAN DEFAULT FALSE;

-- drop default values for isPinned
ALTER TABLE "public"."event"
ALTER COLUMN "isPinned" DROP DEFAULT;
ALTER TABLE "public"."homework"
ALTER COLUMN "isPinned" DROP DEFAULT;