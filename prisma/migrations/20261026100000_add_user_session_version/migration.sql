ALTER TABLE "app_users"
ADD COLUMN IF NOT EXISTS "session_version" INTEGER NOT NULL DEFAULT 0;

-- Revoke already-issued JWT sessions for this account when the feature deploys.
-- The zero-version guard keeps this data update safe if the SQL is re-applied
-- while reconciling an environment whose migration ledger is incomplete.
UPDATE "app_users"
SET "session_version" = 1,
    "updated_at" = NOW()
WHERE "email" = 'amit.rawat@mr3.demo'
  AND "session_version" = 0;

-- Keep new doctor records compatible with the persisted High/Medium/Low constraint.
ALTER TABLE "doctors"
ALTER COLUMN "potential" SET DEFAULT 'Medium';
