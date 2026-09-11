-- AddColumn
ALTER TABLE "Category" ADD COLUMN "archivedFrom" TEXT;

-- Backfill: a category that was archived under the old boolean flag becomes
-- "archived starting this month" rather than losing that state entirely.
-- This also *fixes* the bug being migrated away from -- under the old
-- boolean, archiving hid the category from every past month's breakdown
-- too; backfilling to the current month means past months are unaffected
-- going forward, exactly like every future archive action will behave.
UPDATE "Category" SET "archivedFrom" = to_char(now(), 'YYYY-MM') WHERE "archived" = true;

-- DropColumn
ALTER TABLE "Category" DROP COLUMN "archived";
