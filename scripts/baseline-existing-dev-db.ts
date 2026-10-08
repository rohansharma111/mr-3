import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const requiredEnvironment = "development";
const confirmation = "I_UNDERSTAND_BASELINE_EXISTING_DEV_DATABASE";

if (process.env.MR3_DATABASE_ENV !== requiredEnvironment) {
  throw new Error(
    "Refusing to baseline: set MR3_DATABASE_ENV=development. This command is intentionally development-only."
  );
}

if (process.env.MR3_MIGRATION_BASELINE_CONFIRM !== confirmation) {
  throw new Error(
    "Refusing to baseline: set MR3_MIGRATION_BASELINE_CONFIRM=" + confirmation + " after verifying DATABASE_URL points to the Neon development branch."
  );
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient();

try {
  const ledger = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass('_prisma_migrations') IS NOT NULL AS exists
  `;

  if (ledger[0]?.exists) {
    throw new Error(
      "Prisma migration ledger already exists. Do not use this baseline command; use normal Prisma migration commands instead."
    );
  }

  const schemaDiff = execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-url",
      databaseUrl,
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script"
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();

  if (schemaDiff.length > 0) {
    console.error(schemaDiff);
    throw new Error(
      "Refusing to baseline: the database schema does not exactly match prisma/schema.prisma."
    );
  }

  const migrationsDir = resolve(process.cwd(), "prisma", "migrations");
  if (!existsSync(migrationsDir)) {
    throw new Error("prisma/migrations directory not found.");
  }

  const migrations = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (migrations.length === 0) {
    throw new Error("No Prisma migrations found.");
  }

  console.log(
    "Verified current database schema matches prisma/schema.prisma. Marking " + migrations.length + " existing migrations as applied."
  );

  for (const migration of migrations) {
    console.log("Resolving applied migration: " + migration);
    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["prisma", "migrate", "resolve", "--applied", migration],
      { stdio: "inherit" }
    );
  }

  console.log(
    "Baseline complete. The database now has a Prisma migration ledger without changing application tables."
  );
} finally {
  await prisma.$disconnect();
}
