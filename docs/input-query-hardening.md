# MR 3.0 Input and Query Abuse Hardening

Reviewed the authenticated API input boundaries on `main`.

## Confirmed protections

- UUID inputs are validated before database lookup.
- Enumerated status/priority values are validated.
- Free-text mutation fields have explicit length limits.
- Sample quantities have explicit integer bounds.
- Target numeric values have explicit upper bounds.
- Target periods are limited to one year.
- List endpoints use bounded result sizes where appropriate.
- Dynamic database filters are built from validated values rather than interpolated SQL.
- The AI endpoint has bounded question length and a per-user rate limit.

## Query-range hardening

Historical date filters can otherwise turn a normal authenticated request into an unnecessarily expensive aggregate/group-by query.

The following are now explicitly limited to a maximum one-year range:

- Reports date range.
- My Plan date-filter range.

This complements the existing row limits on list endpoints.

## Raw SQL review

The AI rate limiter uses Prisma's `$queryRawUnsafe`, but its SQL statement is fixed and all runtime values are supplied as bound parameters. No user-controlled SQL fragments are interpolated into the statement.

## Remaining product-level consideration

Authentication itself does not currently have a dedicated credential-attempt limiter. Auth.js remains responsible for credential processing, while the application-level PostgreSQL rate limiter currently protects AI usage. A dedicated login-abuse control can be added later if the deployment threat model requires application-managed credential throttling.

## Conclusion

No direct SQL-injection path or unbounded authenticated list response was identified in the reviewed API surface. Query-range limits were added where broad date filters could otherwise create avoidable database load.
