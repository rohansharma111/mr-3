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

Important source-derived demo values:
- Patches: Veera Desai 19, Vile Parle 25, Versova 21, Andheri Station 18, Oshiwara 15, Lokhandwala 16, Jogeshwari (W) 14.
- Veera Desai doctors: Dr. Ankit Rawal (92 High), Dr. Ramesh Gupta (88 High), Dr. Neha Verma (75 Medium), Dr. Amit Shah (73 Medium), Dr. Pooja Mehta (70 Medium), Dr. Suresh Patil (84 High).
- Vile Parle: Dr. Kirit Desai (95 High), Dr. Sneha Kulkarni (81 High).
- Versova: Dr. Kabir Malik (89 High), Dr. Tanya Sen (68 Medium).
- Stockists: Shree Sai Medicals 480 strips Good; HealthCare Distributors 320 Good; Andheri Medico 110 Average; Lokhandwala Pharma 25 Low.
- Prototype bottom metrics: Total Doctors 1,243; High Potential 312 (25.1%); Total Calls 156; Samples 320; Conversion Rate 18.2%; Top Specialty Cardiologists (42%); Top Molecule Aceclofenac + Paracetamol.
- Writing-pattern categories/molecules are source data in the prototype and are represented in the current UI; they should be moved into persistent analytics data in a later pass.

## Current code
- app/page.tsx is the active main client UI under the root Next.js app directory. It now calls the database-backed doctor API instead of keeping the doctor list as the Explorer data source.
- app/api/doctors/route.ts provides filtered/sorted doctor queries by patch, specialty and search query.
- src/app/api/calls/route.ts provides validated GET/POST call logging; POST persists the call and creates an audit event in one transaction.
- The same calls API now supports filtered history queries by doctor/status and bounded result limits.
- prisma/schema.prisma defines the main domain models.
- prisma/seed.ts provides a repeatable seed foundation for patches, specialties, user and doctors.
- docs/PROJECT_STATE.md is the continuation handoff.

## Current UI status
- Sidebar/navigation follows the prototype structure.
- Doctor Explorer now has hierarchy filters, patch sidebar, database-backed table, sort, map visualization and writing-pattern panel.
- Doctor Potential has the prototype-style deep-profile shell.
- Log Call is now a real modal workflow from Doctor Potential: validated outcome/notes are persisted to Neon and audited.
- My Calls is now a database-backed module with status filtering, refresh, summary cards and call-history table.
- Doctor Potential now surfaces recent calls for the selected doctor using the same call-history source.
- AI Support is now connected to an authenticated server-side Responses API endpoint and grounded in MR 3.0 operational data.
- Stockist Data has the prototype-style summary and stock table.
- My Plan is persistent and auditable.
- Samples are persistent and auditable.
- Targets are now persistent: period-based targets can be created/updated and actual completed calls/sample units are calculated from activity.
- Conversion actuals are intentionally shown as unavailable because the current domain model has no conversion event/outcome entity.
- Reports and Notifications are now implemented.
- Some prototype KPI and profile values remain hardcoded because their underlying domain/analytics models have not yet been fully implemented.

## Explorer coordinate model milestone

- Added dedicated `doctors.map_x` / `doctors.map_y` columns for the prototype's source-backed map positions.
- The development database migration `20261008160000_add_doctor_map_coordinates` was applied to Neon branch `br-wandering-pond-b4wjpdlk` and copied the existing demo source positions from the temporary latitude/longitude fields into the dedicated columns.
- `GET /api/doctors` now reads only `map_x` / `map_y` for the UI `coords` object.
- The Prisma schema and repeatable seed now represent these values explicitly as UI map coordinates rather than geographic GPS.
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

## Profile-data integrity milestone

- Removed unsupported hardcoded Monthly Scripts, Conversion, Next Best Action, verified schedule, and doctor-to-chemist claims from the deep profile.
- These fields now explicitly show unavailable/not tracked until corresponding persisted domain data exists.
- This keeps the prototype visual language while preventing demo values from being presented as live business intelligence.

## Immediate next steps
1. Run a full local/Vercel build validation against the current development branch; the connected environment cannot currently execute a networked npm install/build. The login page now wraps its `useSearchParams()` consumer in `Suspense`, matching the Next.js App Router guidance.
2. Verify the seed path after the Prisma field-to-column mapping alignment.
3. Move subsequent implementation work onto the GitHub `development` branch.
3. Add API/database-driven patch and specialty metadata instead of hardcoded filter arrays.
4. Complete the Explorer data model: writing-pattern analytics and source-backed doctor profile data.
5. Expand doctor profile tabs beyond the current Overview shell; call history is now persisted and visible.
6. Implement Reports and Notifications; My Calls, My Plan, Samples and Targets are now functional.
7. Continue role-specific permission enforcement only where product requirements define clear management/admin boundaries.
8. Validate the applied rate-limit migration and AI Support end-to-end once server AI credentials are configured.
9. Add robust validation, error handling, audit logging, indexes, tests and observability.
10. Configure development/staging/production environment variables and deployment; keep Vercel automatic Git deployments disabled.

11. Only after these are stable, introduce real company/user data import workflows.

## Source rule
When implementing prototype behavior, use the supplied HTML as the source of truth for labels, demo values and terminology. Do not silently invent replacement business data.

## Continuation prompt
Continue MR 3.0 from the repository and Neon state documented in docs/PROJECT_STATE.md. You have GitHub access to rohansharma111/mr-3 and Neon project raspy-sea-44517117. First inspect the current GitHub files and development database before changing anything. Treat ai_studio_code (1).html as the visual/product source of truth. Do not restart or redesign from scratch. Continue from the Immediate next steps in PROJECT_STATE.md, verify the previous implementation, then implement the next production-grade increment. Keep development isolated from Neon production, never commit secrets, preserve the prototype UI, and update PROJECT_STATE.md after meaningful milestones.

## Targets milestone
- Added `app/api/targets/route.ts`.
- GET returns the configured target for a period plus actual completed calls and issued sample units for the demo user.
- POST creates or updates a period target and writes an audit event.
- Conversion target is stored, but actual conversion tracking is explicitly unavailable until a conversion domain model is added.
- No target demo values were invented because the supplied HTML prototype did not contain target numbers.

## Prisma / deployment foundation
- Prisma schema was aligned to the existing Neon SQL naming/types using `@map`, UUID/database type annotations, date/timestamp annotations, and JSONB mapping.
- Added the missing `src/lib/prisma.ts` singleton used by the API routes.
- Added `postinstall: prisma generate` for Vercel build reliability.
- Added root `vercel.json` with Git automatic deployments disabled. Manual deployments remain the intended deployment mechanism.

## Reports and Notifications milestone
- Added `app/api/reports/route.ts` with period-based reporting from persisted Calls, Samples, Plans and Targets.
- Reports expose call status totals, sample issues/units, plan status totals, top doctors by completed calls, and top products by issued sample units.
- Conversion actuals remain explicitly unavailable because the current domain model does not contain conversion events.
- Added persistent `notifications` table and Prisma `Notification` model.
- Added `app/api/notifications/route.ts` for user-scoped listing, unread counts, mark-one-read and mark-all-read.
- Call logging, plan changes, sample changes and target changes now generate persisted notifications.
- Added Reports and Notifications UI while preserving the prototype's visual language.
- Removed the duplicate inactive `src/app` application tree. The active Next.js application is now consistently under the root `app/` directory.
- Root `app/layout.tsx` and `app/globals.css` are now present, and all API routes used by the UI are under root `app/api/`.

## Vercel deployment policy
- `vercel.json` contains `git.deploymentEnabled: false`.
- Git commits are development/version-control actions only; the intended production workflow is manual Vercel deployment.
- Vercel documents `git.deploymentEnabled: false` as the configuration for disabling Git-triggered automatic deployments. A manual deployment from the Vercel dashboard or CLI remains available.
- Because the Vercel project was just created, perform the first deployment manually so the project establishes the repository configuration. After that, future commits should not be used as deployment triggers.

## Authentication milestone

- Auth.js credentials authentication is now implemented on `development`.
- Sessions use Auth.js JWTs with an 8-hour max age.
- User identity is derived from the authenticated session in API routes; the hardcoded demo email is no longer used by application APIs.
- Passwords are stored as bcrypt hashes in `app_users.password_hash`.
- Added `app/login/page.tsx`, `auth.ts`, `proxy.ts`, session typing, and authenticated user UI/sign-out.
- Added the development migration `prisma/migrations/20261008120000_add_user_password_hash/migration.sql`.
- Password provisioning is intentionally environment-driven. Use `npm run auth:set-password` with `MR3_USER_EMAIL` and `MR3_USER_PASSWORD`; never commit plaintext passwords.
- `AUTH_SECRET` is required for Auth.js. Generate it with `npx auth secret` and store it only in local/Vercel environment variables.
- API authorization is still intentionally being hardened further with role-specific permissions and rate limiting in the next security milestone.

## Local development

- Clone the repository and check out `development`.
- Install dependencies with `npm install`.
- Copy `.env.example` to `.env.local`.
- Set `DATABASE_URL` to the **Neon development branch**, not production.
- Generate `AUTH_SECRET` locally with `npx auth secret`.
- Run `npx prisma migrate deploy` against the development database.
- Set a development password with `MR3_USER_EMAIL=... MR3_USER_PASSWORD=... npm run auth:set-password`.
- Start with `npm run dev`.

## Security hardening milestone

- Removed the remaining legacy demo-user lookups from Plans, Samples, Targets and Notifications; mutations now use the authenticated session user.
- Added role validation to the authenticated-user helper. Unknown/unsupported database roles are denied rather than silently treated as a valid role.
- Added requireAuthenticatedUser(allowedRoles?) and requireRole(...) helpers for explicit role enforcement as role-specific business permissions are introduced.
- Added GET /api/me as a session-derived identity endpoint.
- Added production-oriented security response headers in next.config.ts: content-type sniffing protection, strict referrer policy, frame denial, permissions policy, HSTS and cross-origin opener policy.
- Existing business APIs remain user-scoped. No new role restriction was invented where the supplied prototype does not define a clear permission boundary.

## AI Support milestone

- Added src/lib/ai.ts to build a compact, authenticated MR 3.0 context from doctors, products, stockist inventory, the current user's calls, upcoming plans and recent samples.
- Added POST /api/ai/support using the OpenAI Responses API with the API key kept server-side.
- AI input is validated and capped; provider requests have a timeout and provider errors are returned without exposing provider internals.
- AI instructions explicitly prohibit invented MR 3.0 facts, hidden-prompt disclosure, diagnosis/prescribing and unsupported clinical claims.
- AI queries are audited without storing the user's question text.
- AI Support is limited to 20 requests per authenticated user per fixed one-minute window using a persistent PostgreSQL bucket; 429 responses include Retry-After and rate-limit headers.
- The rate limiter requires the `rate_limit_buckets` migration before AI requests can run successfully.
- OPENAI_MODEL is now explicitly required instead of relying on an unverified default model name.
- The AI Support UI now sends real requests, supports the prototype prompt chips, shows loading/errors and labels responses as grounded in MR 3.0 operational data.
- OPENAI_API_KEY, OPENAI_MODEL and optional OPENAI_BASE_URL are documented in .env.example.
- The AI feature intentionally returns a clear configuration error when no server-side API key is configured; it does not simulate a live model.

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
