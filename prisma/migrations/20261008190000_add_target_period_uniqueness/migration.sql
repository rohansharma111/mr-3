CREATE UNIQUE INDEX "targets_user_id_period_start_period_end_key"
ON "targets"("user_id", "period_start", "period_end");
