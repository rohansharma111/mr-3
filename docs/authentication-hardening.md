# MR 3.0 Authentication Abuse Hardening

Credential login attempts are now protected by the existing PostgreSQL-backed rate-limit table.

## Current policy

- Login attempt window: 15 minutes.
- Maximum attempts per normalized email key: 10.
- The rate-limit key is a SHA-256 digest of the normalized email, so the raw email is not stored in the rate-limit key.
- The limiter runs before user lookup/password verification.
- If the rate-limit store is unavailable, credential authorization fails closed.
- Successful authentication clears the corresponding login-attempt bucket.
- Passwords, password hashes, and credential values are not logged.

The existing AI rate limiter remains separate and continues to use a 1-minute, 20-request-per-user policy.

## Trade-off

The current login limiter is keyed by normalized email rather than source IP because the Auth.js credential callback does not currently establish a trusted client-IP abstraction in the application layer. This prevents unlimited brute-force attempts against a known account, but it also means repeated attempts against one email can temporarily block legitimate login for that account.

For a larger public deployment, a layered control can be added using a trusted edge/WAF IP signal plus the account key, with careful handling of forwarded headers.

## Failure behavior

Authentication remains fail-closed when the login limiter cannot be consulted. Successful login is not rejected merely because cleanup of an expired login bucket fails.

No schema change was required because the existing `rate_limit_buckets` table is reused.
