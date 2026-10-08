import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const databaseEnvironment = process.env.MR3_DATABASE_ENV;
const supportedEnvironments = new Set(["development", "production"]);
const confirmationByEnvironment: Record<string, string> = {
  development: "I_UNDERSTAND_BASELINE_EXISTING_DEVELOPMENT_DATABASE",
  production: "I_UNDERSTAND_BASELINE_EXISTING_PRODUCTION_DATABASE"
};

if (!databaseEnvironment || !supportedEnvironments.has(databaseEnvironment)) {
  throw new Error(
    "Refusing to baseline: set MR3_DATABASE_ENV to development or production."
  );
}

const confirmation = confirmationByEnvironment[databaseEnvironment];
if (process.env.MR3_MIGRATION_BASELINE_CONFIRM !== confirmation) {
  throw new Error(
    "Refusing to baseline: set MR3_MIGRATION_BASELINE_CONFIRM=" +
      confirmation +
      " only after verifying DATABASE_URL points to the intended Neon " +
      databaseEnvironment +
      " branch."
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const prismaCli = resolve(
  process.cwd(),
  "node_modules",
  "prisma",
  "build",
  "index.js"
);
if (!existsSync(prismaCli)) {
  throw new Error(
    "Prisma CLI was not found at node_modules/prisma/build/index.js. Run npm install first."
  );
}

function runPrisma(args: string[]) {
  execFileSync(process.execPath, [prismaCli, ...args], {
    stdio: "inherit"
  });
}

const prisma = new PrismaClient();

const expectedMigrations = [
  "20261008120000_add_user_password_hash",
  "20261008150000_add_rate_limit_buckets",
  "20261008160000_add_doctor_map_coordinates",
  "20261008170000_add_writing_pattern_snapshots",
  "20261008190000_add_target_period_uniqueness"
] as const;

async function hasColumn(tableName: string, columnName: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS exists`
  );
  return rows[0]?.exists === true;
}

async function hasTable(tableName: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists`
  );
  return rows[0]?.exists === true;
}

async function hasIndex(indexName: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ${indexName}
    ) AS exists`
  );
  return rows[0]?.exists === true;
}

async function verifyMigrationEffects() {
  const checks: Array<{
    migration: string;
    satisfied: boolean;
    reason: string;
  }> = [
    {
      migration: expectedMigrations[0],
      satisfied: await hasColumn("app_users", "password_hash"),
      reason: "app_users.password_hash exists"
    },
    {
      migration: expectedMigrations[1],
      satisfied:
        (await hasTable("rate_limit_buckets")) &&
        (await hasIndex("rate_limit_buckets_expires_at_idx")),
      reason: "rate_limit_buckets table and expires_at index exist"
    },
    {
      migration: expectedMigrations[2],
      satisfied:
        (await hasColumn("doctors", "map_x")) &&
        (await hasColumn("doctors", "map_y")),
      reason: "doctors.map_x and doctors.map_y exist"
    },
    {
      migration: expectedMigrations[3],
      satisfied:
        (await hasTable("writing_pattern_snapshots")) &&
        (await hasIndex("writing_pattern_snapshots_period_key")),
      reason:
        "writing_pattern_snapshots table and period unique index exist"
    },
    {
      migration: expectedMigrations[4],
      satisfied: await hasIndex(
        "targets_user_id_period_start_period_end_key"
      ),
      reason: "targets period uniqueness index exists"
    }
  ];

  const missing = checks.filter((check) => !check.satisfied);
  if (missing.length > 0) {
    const details = missing
      .map((check) => `- ${check.migration}: ${check.reason}`)
      .join("\n");
    throw new Error(
      "Refusing to baseline: one or more migration effects are missing from the existing database:\n" +
        details
    );
  }

  for (const check of checks) {
    console.log("Verified migration effect: " + check.migration);
  }
}

async function main() {
  try {
    const ledger = await prisma.$queryRaw<Array<{ exists: boolean }>>(
      "SELECT to_regclass('_prisma_migrations') IS NOT NULL AS exists"
    );

    if (ledger[0]?.exists) {
      throw new Error(
        "Prisma migration ledger already exists. Use normal Prisma migration commands instead."
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

    if (
      migrations.length !== expectedMigrations.length ||
      migrations.some(
        (migration, index) => migration !== expectedMigrations[index]
      )
    ) {
      throw new Error(
        "Refusing to baseline: prisma/migrations does not contain exactly the expected migration history."
      );
    }

    await verifyMigrationEffects();

    console.log(
      "Verified that all " +
        expectedMigrations.length +
        " existing migration effects are already present in the " +
        databaseEnvironment +
        " database."
    );

    for (const migration of expectedMigrations) {
      console.log("Resolving applied migration: " + migration);
      runPrisma(["migrate", "resolve", "--applied", migration]);
    }

    console.log(
      "Baseline complete. The existing database schema was not changed; Prisma migration history was initialized."
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
