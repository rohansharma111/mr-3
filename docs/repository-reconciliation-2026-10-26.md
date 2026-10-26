# Repository Reconciliation — 2026-10-26

## Verified repository state

- Repository: `rohansharma111/mr-3`.
- Active continuation branch: `main`, following the instruction to continue development on main.
- Latest comparison: `main` is 14 commits ahead of `development`, and `development` is 6 commits ahead of `main`. The merge base is `2c4528bcbde3755e77301b4d215e02592d4a8ae6`.
- The unique commits are not limited to one file: the development-only comparison currently reports `docs/PROJECT_STATE.md`; main-only changes include auth/session-version work, seed data, workflow configuration, Prisma schema/migration and reconciliation documentation. Do not merge, reset, or force-update either branch until the full commit graph and file-level conflicts are reviewed.
- GitHub Actions must not be triggered. No deployment was initiated.

## Database migration state

Neon project: `raspy-sea-44517117`.

- Development branch: `br-wandering-pond-b4wjpdlk`.
- Production branch: `br-purple-art-b42e2kzf`.
- At the prior direct inspection, both branches showed six finished migration records ending at `20261009010000_add_patch_location_hierarchy`. The session-version migration is not recorded in either ledger. The Prisma model default is `Medium`, matching the development database's `High`/`Medium`/`Low` constraint; the production database currently has a `MEDIUM` default that conflicts with that constraint.
- Production has `public.app_users.session_version`; development does not.
- A fresh schema comparison between development and production shows broader drift than that one column: it includes `session_version`, column ordering and timestamp precision/default differences, doctor `potential` defaults/check values and numeric precision/coordinates, among other differences. Therefore these databases cannot be treated as schema-identical, and the session-version column is not the only reconciliation item.
- Do not run `prisma migrate deploy`, baseline either database, manually edit `_prisma_migrations`, or attempt a bulk schema sync until the full intended schema and migration history are reconciled against the actual migration files.

## Session revocation

- Production's `amit.rawat@mr3.demo` record was conditionally updated from session version 0 to 1; the database confirmed the resulting value is 1.
- This only causes old JWTs to be rejected if the deployed application code is already checking session versions. The production deployment/code version was not verified, and no deployment was performed.
- Migration `prisma/migrations/20261026100000_add_user_session_version/migration.sql` uses `ADD COLUMN IF NOT EXISTS` and a `session_version = 0` guard to make the column addition and targeted version update repeatable. It currently does not include the doctor-default correction; that database change remains pending. This migration does not reconcile the migration ledger by itself.

## Safe next steps

1. Review the exact unique commits and conflicting source changes on both branches before integrating either direction.
2. Inspect every migration directory and compare the intended Prisma schema to each Neon branch; classify differences as intentional schema changes versus type/default drift.
3. Prepare a development-only migration plan and verify it on a temporary Neon branch before any persistent schema change.
4. Design production migration-history reconciliation separately. Do not baseline production using the development procedure.
5. Run lint, typecheck, build and targeted authentication tests in an environment with dependencies available. Do not claim checks passed unless observed.
6. Keep GitHub Actions and deployments untouched unless explicitly requested.


## Follow-up validation — 2026-10-26

- Updated `prisma/schema.prisma` so new doctor records default to `Medium`, which is accepted by the actual database check constraint (`High`, `Medium`, `Low`). The previous `MEDIUM` default could violate that constraint when a create operation omitted `potential`.
- Tested the default correction on a Neon temporary branch cloned from production. The verified column default was `'Medium'::text`. The temporary branch has not been promoted or applied to production.
- The temporary migration workflow's parent was production, not development. The temporary branch was discarded with the user's approval and no persistent changes were applied.
- No changes have been applied to either persistent database in this follow-up. No GitHub Actions workflow or deployment was triggered.


## Additional source/database alignment findings — 2026-10-26

- Fixed `app/api/dashboard/summary/route.ts` to count `potential = 'High'`, matching persisted values and the database check constraint. Previously it queried `'HIGH'`, which would undercount high-potential doctors.
- `app/api/doctors/route.ts` still normalizes only uppercase `HIGH`/`LOW` values. The actual stored values are title case, so this response mapping needs a follow-up correction. An attempted direct update was blocked by the repository write safety check and was not applied.
- `src/lib/auth-user.ts` defines `AREA_MANAGER`, while both Neon branches' `app_users.role` constraint allows `ADMIN`, `MANAGER`, `FIELD_MANAGER`, and `ANALYST`. Current user data contains only `FIELD_MANAGER`, but the application role vocabulary and database constraint are inconsistent. Do not broaden roles or change constraints without an explicit, coherent role policy.
- The pending migration file currently contains only the session-version addition/revocation. The doctor default correction is not included in a migration yet. Direct attempts to create/update the migration SQL file were blocked by repository write safety checks; no database change was made to work around that block.
- The session-version migration is still not recorded in either persistent database's Prisma ledger. The development database still lacks `session_version`. These are prerequisites for a reliable validation run.
- Current branch comparison after recent main commits: `main` is 18 commits ahead of `development`; `development` has 6 commits not in `main`. The development-only comparison remains limited to `docs/PROJECT_STATE.md`, so preserve its history without merging the stale branch wholesale.
- GitHub Actions and deployments remain untouched.
