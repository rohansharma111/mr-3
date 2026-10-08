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

## Current infrastructure
### GitHub
- Repo: rohansharma111/mr-3
- Default branch: main
- develop branch exists.
- Initial foundation files are committed.
- Latest application page contains the first React conversion of Explorer, Potential, AI Support and Stockist sections.

### Neon
- Project: MR 3.0
- Project ID: raspy-sea-44517117
- Region: AWS US East 2 (Ohio)
- production branch: br-purple-art-b42e2kzf
- development branch: br-wandering-pond-b4wjpdlk
- Development schema and initial demo records have been created.
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

Important source-derived demo values:
- Patches: Veera Desai 19, Vile Parle 25, Versova 21, Andheri Station 18, Oshiwara 15, Lokhandwala 16, Jogeshwari (W) 14.
- Veera Desai doctors: Dr. Ankit Rawal (92 High), Dr. Ramesh Gupta (88 High), Dr. Neha Verma (75 Medium), Dr. Amit Shah (73 Medium), Dr. Pooja Mehta (70 Medium), Dr. Suresh Patil (84 High).
- Vile Parle: Dr. Kirit Desai (95 High), Dr. Sneha Kulkarni (81 High).
- Versova: Dr. Kabir Malik (89 High), Dr. Tanya Sen (68 Medium).
- Stockists: Shree Sai Medicals 480 strips Good; HealthCare Distributors 320 Good; Andheri Medico 110 Average; Lokhandwala Pharma 25 Low.
- Prototype bottom metrics: Total Doctors 1,243; High Potential 312 (25.1%); Total Calls 156; Samples 320; Conversion Rate 18.2%; Top Specialty Cardiologists (42%); Top Molecule Aceclofenac + Paracetamol.

## Current code
- src/app/page.tsx is a client-side first-pass conversion. It still has some demo values hardcoded.
- src/app/api/doctors/route.ts now provides a database-backed doctor query endpoint.
- prisma/schema.prisma defines the main domain models.
- The development branch has the initial database schema and source-derived demo records.

## Immediate next steps
1. Verify TypeScript/Prisma schema and seed correctness.
2. Make Doctor Explorer call the database-backed API rather than local doctor arrays.
3. Move patches and specialties into API/database-driven filters.
4. Rebuild the exact prototype Explorer layout, including the patch sidebar, filters, table, map pins, writing pattern panel and stockist bridge.
5. Implement doctor profile tabs and call-log modal as real persisted workflows.
6. Implement My Plan, My Calls, Samples, Targets, Reports and Notifications modules.
7. Add authentication and RBAC before production deployment.
8. Add AI Support server route; never expose provider API keys to browser.
9. Add validation, audit events, rate limiting, error handling and tests.
10. Configure deployment and separate production/development environment variables.

## Source rule
When implementing prototype behavior, use the supplied HTML as the source of truth for labels, demo values and terminology. Do not silently invent replacement business data.

## Continuation prompt
Continue MR 3.0 from the repository and Neon state documented in docs/PROJECT_STATE.md. You have GitHub access to rohansharma111/mr-3 and Neon project raspy-sea-44517117. First inspect the current GitHub files and development database before changing anything. Treat ai_studio_code (1).html as the visual/product source of truth. Do not restart or redesign from scratch. Continue from the Immediate next steps in PROJECT_STATE.md, verify the previous implementation, then implement the next production-grade increment. Keep development isolated from Neon production, never commit secrets, preserve the prototype UI, and update PROJECT_STATE.md after meaningful milestones.
