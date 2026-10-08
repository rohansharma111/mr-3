CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" TEXT NOT NULL,
  "window_start" TIMESTAMPTZ(6) NOT NULL,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "rate_limit_buckets_expires_at_idx"
  ON "rate_limit_buckets" ("expires_at");
