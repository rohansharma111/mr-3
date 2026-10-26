# Repository Reconciliation — 2026-10-26

## Verified repository state

- Repository: `rohansharma111/mr-3`.
- Active working branch for this continuation: `main`, following the project instruction to continue development on main.
- `main` and `development` are diverged. At inspection, main was 12 commits ahead and 6 behind development; do not merge, reset, or force-update either branch without reviewing the exact commit graph and file diffs.
- GitHub Actions must not be triggered as part of this work. The workflow is configured for manual-only execution.
- No deployment was initiated.

## Database state verified read-only

Neon project: `raspy-sea-44517117`.

Both Neon branches have a `public._prisma_migrations` ledger with six finished migrations and no rolled-back or incomplete entries. The ledger currently ends at `20261009010000_add_patch_location_hierarchy` on both branches.

- Production branch `br-purple-art-b42e2kzf`: `app_users.session_version` exists.
- Development branch `br-wandering-pond-b4wjpdlk`: `app_users.session_version` does not exist.
- This is a real schema/code mismatch for the current main authentication implementation. Do not run `prisma migrate deploy` until the development schema and migration history are reconciled safely.
- Do not manually insert rows into `_prisma_migrations`. Use Prisma's supported migration resolution workflow after validating the exact schema diff.
- Production schema/migration history must be reconciled separately; do not assume the development baseline procedure is safe for production.

## Session revocation

- The production user's `session_version` was changed from 0 to 1 for `amit.rawat@mr3.demo`, using a conditional update. The database confirmed the resulting version is 1.
- This prepares the current main authentication code to reject JWTs issued with the prior version. It does not itself deploy code or prove that the currently running production application is already enforcing session versions.
- The migration SQL was updated to use a zero-version guard and set the version to 1, making its account update repeatable if migration bookkeeping requires reconciliation.
- No production deployment was performed.

## Next safe steps

1. Inspect the full main/development commit graph and reconcile development without losing either branch's unique work.
2. Compare the complete Prisma schema to the development database and resolve the missing `session_version` column through the repository's supported migration workflow.
3. Confirm whether the production schema change was previously applied outside Prisma and document a safe production migration-history reconciliation plan.
4. Run lint, typecheck, build and targeted authentication tests in an environment with the repository dependencies available. Do not claim these checks passed until results are observed.
5. Keep automated Git deployments disabled and do not trigger GitHub Actions unless explicitly requested.
