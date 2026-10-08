# MR 3.0 — Project State / Continuation Handoff

## Product
MR 3.0 — “Smarter. Faster. Better.”

The supplied file ai_studio_code (1).html is the visual/product reference. It is a 67,531-byte HTML prototype. The goal is to turn it into a professional, scalable application without throwing away its UI language or demo dataset.

## Stack
- Next.js + React + TypeScript
- Tailwind CSS
- Prisma ORM
- Neon PostgreSQL
- GitHub repository: rohansharma111/mr-3
- Vercel configuration is version-controlled with automatic Git deployments disabled; deployments are intended to be manual.

## Current infrastructure
### GitHub
- Repo: rohansharma111/mr-3
- Default branch: main
- develop branch exists.
- Foundation, database schema, doctor API, seed, database-backed UI and persistent call workflow are committed on main.
- `development` is the active implementation branch. It is promoted to `main` only at stable milestones.
- The current UI is a first production-oriented React conversion and is being expanded incrementally.

### Neon
- Project: MR 3.0
- Project ID: raspy-sea-44517117
- Region: AWS US East 2 (Ohio)
- production branch: br-purple-art-b42e2kzf
- development branch: br-wandering-pond-b4wjpdlk
- Development schema and initial demo records have been created.
- Verified development counts: 10 doctors, 7 patches, 7 products, 4 stockists, 3 calls, 1 sample issue, 1 audit log.
- Do not use production for development experiments.

## Database
Current entities:
- app_users
- patches
- specialties
- doctors
- doctor_patches
- products
- calls
- sample_issues
- stockists
- stockist_inventory
- targets
- audit_logs
- plans
- notifications
- rate_limit_buckets
- writing_pattern_snapshots

Important source-derived demo values:
- Patches: Veera Desai 19, Vile Parle 25, Versova 21, Andheri Station 18, Oshiwara 15, Lokhandwala 16, Jogeshwari (W) 14.
- Veera Desai doctors: Dr. Ankit Rawal (92 High), Dr. Ramesh Gupta (88 High), Dr. Neha Verma (75 Medium), Dr. Amit Shah (73 Medium), Dr. Pooja Mehta (70 Medium), Dr. Suresh Patil (84 High).
- Vile Parle: Dr. Kirit Desai (95 High), Dr. Sneha Kulkarni (81 High).
- Versova: Dr. Kabir Malik (89 High), Dr. Tanya Sen (68 Medium).
- Stockists: Shree Sai Medicals 480 strips Good; HealthCare Distributors 320 Good; Andheri Medico 110 Average; Lokhandwala Pharma 25 Low.
- Prototype bottom metrics: Total Doctors 1,243; High Potential 312 (25.1%); Total Calls 156; Samples 320; Conversion Rate 18.2%; Top Specialty Cardiologists (42%); Top Molecule Aceclofenac + Paracetamol.
- Writing-pattern categories/molecules are source data in the prototype and are persisted as explicit prototype source snapshots; they are not presented as doctor-specific prescribing analytics.

## Current code
- app/page.tsx is the active main client UI under the root Next.js app directory. It now calls the database-backed doctor API instead of keeping the doctor list as the Explorer data source.
- app/api/doctors/route.ts provides filtered/sorted doctor queries by patch, specialty and search query.
- app/api/calls/route.ts provides validated GET/POST call logging; POST persists the call and creates an audit event in one transaction.
- The calls API supports filtered history queries by doctor/status and bounded result limits.
- prisma/schema.prisma defines the main domain models.
- prisma/seed.ts provides a repeatable seed foundation for patches, specialties, user, doctors, stockists, products and source analytics.
- docs/PROJECT_STATE.md is the continuation handoff.

## Current UI status
- Sidebar/navigation follows the prototype structure.
- Doctor Explorer has hierarchy filters, patch sidebar, database-backed table, sort, map visualization and writing-pattern panel.
- Doctor Potential has the prototype-style deep-profile shell.
- Log Call is a real modal workflow from Doctor Potential: validated outcome/notes are persisted to Neon and audited.
- My Calls is a database-backed module with status filtering, refresh, summary cards and call-history table.
- Doctor Potential surfaces recent calls for the selected doctor using the same call-history source.
- AI Support is connected to an authenticated server-side Responses API endpoint and grounded in MR 3.0 operational data.
- Stockist Data has the prototype-style summary and stock table backed by Neon.
- My Plan is persistent and auditable.
- Samples are persistent and auditable.
- Targets are persistent: period-based targets can be created/updated and actual completed calls/sample units are calculated from activity.
- Conversion actuals are intentionally shown as unavailable because the current domain model has no conversion event/outcome entity.
- Reports and Notifications are implemented.
- Unsupported prototype KPI/profile claims have been replaced with explicit unavailable/not-tracked states.

## Explorer coordinate model milestone
- Added dedicated `doctors.map_x` / `doctors.map_y` columns for the prototype's source-backed map positions.
- The development database migration `20261008160000_add_doctor_map_coordinates` was applied to Neon branch `br-wandering-pond-b4wjpdlk` and copied the existing demo source positions from the temporary latitude/longitude fields into the dedicated columns.
- `GET /api/doctors` now reads only `map_x` / `map_y` for the UI `coords` object.
- The Prisma schema and repeatable seed represent these values explicitly as UI map coordinates rather than geographic GPS.
- The legacy latitude/longitude values were retained unchanged to avoid destructive data mutation; application code no longer treats them as map coordinates.

## Dashboard summary milestone
- Added authenticated `GET /api/dashboard/summary`.
- Replaced the prototype footer's hardcoded KPI claims with values calculated from the development database and authenticated user's activity.
- Conversion rate remains explicitly `Not tracked` because no conversion event model exists.
- Top specialty is calculated from active doctors; top molecule is calculated from issued sample activity for the authenticated user.
- No schema change was required for this milestone.

## Writing-pattern analytics milestone
- Added persistent `writing_pattern_snapshots` data for the two writing-pattern periods explicitly present in the supplied HTML prototype.
- Added authenticated `GET /api/analytics/writing-pattern` and switched the Explorer writing-pattern panel to load from Neon.
- Preserved the prototype category/molecule percentages and insights exactly as source data.
- The API explicitly returns `doctorSpecific: false`: the supplied prototype does not provide enough underlying event data to claim these percentages are individual-doctor prescribing analytics.
- Seed data upserts the same source snapshots for repeatable development setup.

## Doctor profile API milestone

- Added authenticated `GET /api/doctors/[id]/profile`.
- The route returns the selected doctor's persisted profile fields, specialty and patch membership, plus user-scoped recent calls, sample issues and plans.
- It calculates only activity metrics that can be derived from persisted records: completed calls, total calls, issued sample units, sample issue count, plan count and last activity.
- It also exposes the existing Last 3 Months writing-pattern snapshot while explicitly preserving `doctorSpecific: false`.
- No unsupported schedule, chemist, conversion or prescribing claims were added.
- This establishes the server-side data contract for expanding the Doctor Potential tabs without embedding demo-only business claims in the client.

## Profile-data integrity milestone
- Removed unsupported hardcoded Monthly Scripts, Conversion, Next Best Action, verified schedule, and doctor-to-chemist claims from the deep profile.
- These fields now explicitly show unavailable/not tracked until corresponding persisted domain data exists.
- This keeps the prototype visual language while preventing demo values from being presented as live business intelligence.

## Authentication milestone
- Auth.js credentials authentication is implemented on `development`.
- Sessions use Auth.js JWTs with an 8-hour max age.
- User identity is derived from the authenticated session in API routes; the hardcoded demo email is no longer used by application APIs.
- Passwords are stored as bcrypt hashes in `app_users.password_hash`.
- Added `app/login/page.tsx`, `auth.ts`, `proxy.ts`, session typing, and authenticated user UI/sign-out.
- Added the development migration `20261008120000_add_user_password_hash/migration.sql`.
- Password provisioning is intentionally environment-driven. Use `npm run auth:set-password` with `MR3_USER_EMAIL` and `MR3_USER_PASSWORD`; never commit plaintext passwords.
- `AUTH_SECRET` is required for Auth.js. Generate it with `npx auth secret` and store it only in local/Vercel environment variables.
- The login page wraps its `useSearchParams()` consumer in `Suspense` to satisfy the Next.js App Router production build requirement.

## Security hardening milestone
- Removed remaining legacy demo-user lookups from Plans, Samples, Targets and Notifications; mutations now use the authenticated session user.
- Added role validation to the authenticated-user helper. Unknown/unsupported database roles are denied rather than silently treated as valid roles.
- Added `requireAuthenticatedUser(allowedRoles?)` and `requireRole(...)` helpers for explicit role enforcement as role-specific business permissions are introduced.
- Added `GET /api/me` as a session-derived identity endpoint.
- Added production-oriented security response headers in `next.config.ts`: content-type sniffing protection, strict referrer policy, frame denial, permissions policy, HSTS and cross-origin opener policy.
- Existing business APIs remain user-scoped. No new role restriction was invented where the supplied prototype does not define a clear permission boundary.

## AI Support milestone
- Added `src/lib/ai.ts` to build a compact, authenticated MR 3.0 context from doctors, products, stockist inventory, the current user's calls, upcoming plans and recent samples.
- Added `POST /api/ai/support` using the OpenAI Responses API with the API key kept server-side.
- AI input is validated and capped; provider requests have a timeout and provider errors are returned without exposing provider internals.
- AI instructions explicitly prohibit invented MR 3.0 facts, hidden-prompt disclosure, diagnosis/prescribing and unsupported clinical claims.
- AI queries are audited without storing the user's question text.
- AI Support is limited to 20 requests per authenticated user per fixed one-minute window using a persistent PostgreSQL bucket; 429 responses include Retry-After and rate-limit headers.
- The rate limiter requires the `rate_limit_buckets` migration before AI requests can run successfully.
- `OPENAI_MODEL` is explicitly required instead of relying on an unverified default model name.
- The AI Support UI sends real requests, supports prototype prompt chips, shows loading/errors and labels responses as grounded in MR 3.0 operational data.
- The AI feature returns a clear configuration error when no server-side API key is configured; it does not simulate a live model.

## Explorer metadata milestone
- Added authenticated `GET /api/metadata` for database-backed patch and specialty metadata.
- Replaced the Explorer UI's hardcoded patch list and specialty list with metadata loaded from Neon.
- Patch display counts use the persisted `patches.doctor_count` values from the source-derived demo dataset.
- The Explorer keeps the existing prototype labels and visual structure while removing those filter metadata constants from the client.

## Rate-limit migration milestone
- Applied `prisma/migrations/20261008150000_add_rate_limit_buckets/migration.sql` to the Neon development branch `br-wandering-pond-b4wjpdlk`.
- Verified `public.rate_limit_buckets` exists with its primary key and expiry index.
- Production Neon was not modified.

## Stockist milestone
- Added authenticated `GET /api/stockists` backed by `stockists` and `stockist_inventory`.
- Replaced the prototype's hardcoded stockist table with a database-backed Stockist Data panel.
- Current development data exposes the four source-derived stockists and inventory for the Aceclofenac + Paracetamol molecule.
- Inventory quantities/statuses remain read-only for now; mutation workflows will be added only when the product requirements define the stockist update process.

## Reports and Notifications milestone
- Added `app/api/reports/route.ts` with period-based reporting from persisted Calls, Samples, Plans and Targets.
- Reports expose call status totals, sample issues/units, plan status totals, top doctors by completed calls, and top products by issued sample units.
- Conversion actuals remain explicitly unavailable because the current domain model does not contain conversion events.
- Added persistent `notifications` table and Prisma `Notification` model.
- Added `app/api/notifications/route.ts` for user-scoped listing, unread counts, mark-one-read and mark-all-read.
- Call logging, plan changes, sample changes and target changes now generate persisted notifications.
- Added Reports and Notifications UI while preserving the prototype's visual language.
- Removed the duplicate inactive `src/app` application tree. The active Next.js application is now consistently under root `app/`.

## Vercel deployment policy
- `vercel.json` contains `git.deploymentEnabled: false`.
- Git commits are development/version-control actions only; the intended production workflow is manual Vercel deployment.
- The Vercel project was created from GitHub, but no claim is made that a dashboard deployment setting was manually verified through a connected Vercel API.
- The first deployment should be performed manually by the user so the project establishes its repository configuration. Future commits should not be treated as deployment triggers.

## Prisma / deployment foundation
- Prisma schema is aligned to the existing Neon SQL naming/types using `@map`, UUID/database type annotations, date/timestamp annotations, and JSONB mapping.
- Added the missing `src/lib/prisma.ts` singleton used by API routes.
- Added `postinstall: prisma generate` for Vercel build reliability.
- Added root `vercel.json` with Git automatic deployments disabled.

## Migration/deployment hardening milestone
- Verified the Neon development branch is `br-wandering-pond-b4wjpdlk` and remains isolated from the production branch.
- Verified the development database contains the expected application tables, including `writing_pattern_snapshots` and `rate_limit_buckets`.
- Verified the development database currently has **no `_prisma_migrations` ledger**.
- This means existing schema changes were applied directly while migration files were committed separately; it is not safe to claim that `prisma migrate deploy` is currently validated.
- Added `scripts/baseline-existing-dev-db.ts` and `npm run db:baseline-dev`.
- The baseline command is deliberately development-only and requires explicit environment confirmation. Before marking migrations applied, it:
  1. refuses to run if `_prisma_migrations` already exists;
  2. runs `prisma migrate diff` from the current database to `prisma/schema.prisma`;
  3. refuses to continue if any schema difference exists;
  4. enumerates the repository migration directories in order;
  5. uses the supported Prisma `migrate resolve --applied` command for each existing migration.
- The script changes migration bookkeeping only; it does not alter application tables.
- The baseline has **not** been executed yet because the connected environment cannot run the repository's networked npm/Prisma toolchain. The user should run it locally against the Neon development branch after verifying the diff is empty.
- Do not manually insert rows into `_prisma_migrations`, and do not run the baseline command against production.

## Production Neon promotion milestone

- Created a recovery snapshot of the existing production branch before promotion: `mr3-production-pre-promotion-20261008` (snapshot `snap-cool-flower-b4jfgecu`).
- Validated a temporary `production-candidate-20261008` branch copied from development before promotion.
- The existing production branch was initially empty of MR 3.0 application tables. Because Neon snapshots are restricted to root branches, the candidate could not be promoted through the snapshot-restore workflow directly.
- With explicit user approval, the validated candidate schema and demo records were copied into the existing production branch `br-purple-art-b42e2kzf`.
- Production now contains the 16 MR 3.0 application tables and verified demo counts: 10 doctors, 7 patches, 5 specialties, 7 products, 10 doctor-patch memberships, 3 calls, 1 sample issue, 4 stockists, 8 inventory rows, 1 plan, 2 writing-pattern snapshots, 1 audit log, and no targets/notifications/rate-limit buckets.
- Production was hardened with the domain checks already present in the validated development database, including role, call status, doctor score/potential, plan status/priority, sample quantity/status, inventory quantity/status and target range checks.
- The production branch still has **no `_prisma_migrations` ledger**. Do not claim Prisma migration history is initialized or run `prisma migrate deploy` until a safe production baseline procedure has been designed and validated locally.
- The production branch could not be protected because the current Neon plan has reached its protected-branch limit; no production protection setting was changed.
- The temporary candidate branch remains available for verification/recovery and has not been deleted.

## Doctor Potential persisted-profile UI milestone

- Wired the Doctor Potential deep-profile screen to authenticated `GET /api/doctors/[id]/profile`.
- Added a persisted profile loading/error state and four functional tabs: Overview, Prescribing, History and Insights.
- Overview now shows only persisted potential/activity metrics and recent calls.
- History now shows persisted calls, sample issues and plans for the authenticated user.
- Prescribing explicitly labels the prototype writing-pattern snapshot as source data and keeps `doctorSpecific: false`; it is not presented as individual-doctor prescribing history.
- Insights shows persisted activity totals/last activity and explicitly keeps conversion, doctor availability and doctor-to-chemist relationships unavailable because they are not modeled.
- The existing prototype visual language and actions (Add to Plan, Issue Samples, Log Call) were preserved.
- No new business facts or unsupported KPIs were introduced.

## API query-validation hardening milestone

- Hardened the authenticated Calls, Samples and Plans read endpoints against malformed query parameters.
- Invalid doctor UUID filters now return controlled HTTP 400 responses instead of reaching Prisma with invalid identifiers.
- Invalid sample/plan status filters now return controlled HTTP 400 responses.
- Invalid or reversed plan date ranges now return controlled HTTP 400 responses.
- No database schema or business behavior was changed by this increment.

## Validation status
- Neon development schema/data checks have been performed through the connected Neon integration.
- GitHub source/tree checks have been performed.
- Full `npm install`, Next.js build, TypeScript check and Prisma CLI validation have **not** been executed in the connected environment because it cannot reliably access GitHub/npm over the network.
- The recent login `Suspense` fix was made specifically for the Next.js production-build error previously observed.
- Do not claim Vercel deployment or a successful production build until the user runs the local validation workflow.

## Immediate next steps
1. Run `npm install` and `npm run typecheck` locally on the `development` branch.
2. Run `npm run db:baseline-dev` locally with `DATABASE_URL` pointing only to Neon development, `MR3_DATABASE_ENV=development`, and `MR3_MIGRATION_BASELINE_CONFIRM=I_UNDERSTAND_BASELINE_EXISTING_DEV_DATABASE`. Stop if the Prisma schema diff is non-empty.
3. Run `npx prisma migrate status` after baselining and confirm the repository migration history is recognized.
4. Run `npm run build` locally and resolve any compile/type/runtime build issues before promotion.
5. Validate the new Doctor Potential persisted-profile UI locally with `npm run typecheck` and `npm run build`.
6. Continue role-specific permission enforcement only where product requirements define clear management/admin boundaries.
7. Validate AI Support end-to-end once server AI credentials are configured.
8. Add robust validation, error handling, audit logging, indexes, tests and observability.
9. Configure development/staging/production environment variables and deployment; keep Vercel automatic Git deployments disabled.
10. Design and validate a production-safe Prisma migration baseline workflow before making future production schema changes through migrations.
11. Only after these are stable, introduce real company/user data import workflows.

## Local development

Clone the repository and check out `development`.

Install dependencies:
```powershell
npm install
```

Copy `.env.example` to `.env.local`.

Set `DATABASE_URL` to the **Neon development branch**, not production.

Generate `AUTH_SECRET` locally with `npx auth secret`.

Set a development password:
```powershell
$env:MR3_USER_EMAIL="amit.rawat@mr3.demo"
$env:MR3_USER_PASSWORD="YOUR_STRONG_PASSWORD"
npm run auth:set-password
```

Baseline the existing development database once, only after reviewing the command's schema-diff output:
```powershell
$env:MR3_DATABASE_ENV="development"
$env:MR3_MIGRATION_BASELINE_CONFIRM="I_UNDERSTAND_BASELINE_EXISTING_DEV_DATABASE"
npm run db:baseline-dev
npx prisma migrate status
```

Then start:
```powershell
npm run dev
```

For a production-quality validation pass:
```powershell
npm run typecheck
npm run build
```

## Source rule
When implementing prototype behavior, use the supplied HTML as the source of truth for labels, demo values and terminology. Do not silently invent replacement business data.

## Continuation prompt
Continue MR 3.0 from the repository and Neon state documented in docs/PROJECT_STATE.md. You have GitHub access to rohansharma111/mr-3 and Neon project raspy-sea-44517117. First inspect the current GitHub files and development database before changing anything. Treat ai_studio_code (1).html as the visual/product source of truth. Do not restart or redesign from scratch. Continue from the Immediate next steps in PROJECT_STATE.md, verify the previous implementation, then implement the next production-grade increment. Keep development isolated from Neon production, never commit secrets, preserve the prototype UI, and update PROJECT_STATE.md after meaningful milestones.
## API cache/privacy hardening milestone
- Added explicit response headers for all `/api/:path*` routes: `Cache-Control: private, no-store, max-age=0`, `X-Robots-Tag: noindex, nofollow, noarchive`, and `Cross-Origin-Resource-Policy: same-origin`.
- API routes retain the existing security header set while ensuring authenticated operational data is not intentionally cached or indexed by compliant intermediaries/crawlers.
- No database schema or business behavior changed in this increment.
- This is a defense-in-depth measure; local typecheck/build validation is still pending.
## API input validation hardening milestone
- Hardened Stockist Data filters: malformed product UUIDs and oversized/blank molecule filters now return controlled HTTP 400 responses.
- Hardened Notifications: the `unread` query accepts only `true` or `false`, and PATCH requests can no longer submit both a notification id and `markAllRead` simultaneously.
- Hardened Reports and Targets date filters with strict YYYY-MM-DD validation plus calendar-date round-trip validation, preventing silently normalized invalid dates from reaching database queries.
- No schema or business-data changes were made in this increment.
- Full local typecheck/build validation remains pending because the connected environment cannot run the repository's networked npm/Prisma toolchain reliably.
\n
## Explorer and call-query hardening milestone
- Hardened Doctor Explorer query parameters with bounded patch/specialty/search inputs and an explicit sort enum; malformed filters now return HTTP 400.
- Hardened Calls history with explicit status validation and made the validated status filter actually constrain the database query.
- No database schema or business-data changes were made.
\n
## Mutation concurrency hardening milestone
- Plan creation now handles the database unique-constraint race explicitly and returns a controlled HTTP 409 instead of leaking a database exception when concurrent requests create the same user/doctor/time plan.
- No schema or data changes were made in this increment; the existing plan uniqueness constraint is now surfaced safely at the API boundary.
- Unexpected plan-creation failures return a sanitized server error without exposing database details.
\n