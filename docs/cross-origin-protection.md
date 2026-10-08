# MR 3.0 Cross-Origin Mutation Protection

Authenticated API mutations are now protected by a centralized same-origin check in `proxy.ts`.

## Policy

For non-GET/HEAD/OPTIONS requests under `/api/*`:

- If an `Origin` header is present, its origin must exactly match the request origin.
- A malformed or non-matching Origin is rejected with HTTP 403.
- Requests without an Origin header remain accepted for compatibility with non-browser clients and server-side integrations.
- Auth.js routes under `/api/auth/*` are excluded because Auth.js owns their authentication/CSRF handling.
- The existing request-correlation ID is returned on blocked requests.

This adds a defense-in-depth layer against cross-site browser requests attempting to trigger authenticated MR 3.0 mutations.

## Scope

The protection covers current mutation APIs such as calls, plans, samples, targets, and notification updates without requiring each route to implement its own origin check.

No database schema changes are required.
