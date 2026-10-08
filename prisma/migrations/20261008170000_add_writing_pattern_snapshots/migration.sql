CREATE TABLE "writing_pattern_snapshots" (
  "id" UUID NOT NULL,
  "period" TEXT NOT NULL,
  "categories" JSONB NOT NULL,
  "molecules" JSONB NOT NULL,
  "insight" TEXT NOT NULL,
  "source_label" TEXT NOT NULL DEFAULT 'PROTOTYPE_SOURCE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "writing_pattern_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "writing_pattern_snapshots_period_key" ON "writing_pattern_snapshots"("period");