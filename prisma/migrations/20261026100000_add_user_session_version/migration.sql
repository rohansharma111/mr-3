ALTER TABLE "app_users"
ADD COLUMN IF NOT EXISTS "session_version" INTEGER NOT NULL DEFAULT 0;

-- Revoke already-issued JWT sessions for this account when the feature deploys.
UPDATE "app_users"
SET "session_version" = "session_version" + 1,
    "updated_at" = NOW()
WHERE "email" = 'amit.rawat@mr3.demo';
