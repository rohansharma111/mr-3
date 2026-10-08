ALTER TABLE "doctors"
  ADD COLUMN "map_x" DECIMAL(5,2),
  ADD COLUMN "map_y" DECIMAL(5,2);

UPDATE "doctors"
SET
  "map_x" = "latitude",
  "map_y" = "longitude"
WHERE "is_demo" = true
  AND "latitude" IS NOT NULL
  AND "longitude" IS NOT NULL;
