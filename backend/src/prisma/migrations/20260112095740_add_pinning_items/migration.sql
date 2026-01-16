-- add isPinned field to homework table; enforce NOT NULL and default FALSE for safety
ALTER TABLE "homework" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT FALSE;
-- add isPinned field to event table; enforce NOT NULL and default FALSE for safety
ALTER TABLE "event" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT FALSE;