ALTER TABLE "patches"
  ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT 'Maharashtra';

ALTER TABLE "patches"
  ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'Andheri Region';

CREATE INDEX IF NOT EXISTS "patches_state_region_idx"
  ON "patches" ("state", "region");