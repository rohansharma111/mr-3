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

const prisma = new PrismaClient();

try {
  const ledger = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass('_prisma_migrations') IS NOT NULL AS exists
  `;

  if (ledger[0]?.exists) {
    throw new Error(
      "Prisma migration ledger already exists. Use normal Prisma migration commands instead."
    );
  }

  const schemaDiff = execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-schema-datasource",
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
    "Verified the " +
      databaseEnvironment +
      " database schema matches prisma/schema.prisma. Marking " +
      migrations.length +
      " existing migrations as applied."
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
    "Baseline complete. The existing database schema was not changed; Prisma migration history was initialized."
  );
} finally {
  await prisma.$disconnect();
}
