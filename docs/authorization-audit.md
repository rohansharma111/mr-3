# MR 3.0 Authorization Boundary Review

Reviewed the authenticated API data paths on the `main` branch.

## User-scoped resources

The following resources derive ownership from the authenticated database user returned by `getAuthenticatedUser()`:

- Calls
- Plans
- Samples
- Targets
- Notifications
- Dashboard activity counts
- Reports
- Doctor profile activity
- AI Support context and rate limiting

For mutation endpoints, record creation uses the authenticated user's ID rather than a client-supplied user ID. Record updates use the authenticated user's ID in the lookup predicate before mutation.

## Shared reference data

These resources are intentionally shared reference data for authenticated MR 3.0 users:

- Doctors
- Specialties
- Patches
- Products
- Stockists and inventory
- Prototype writing-pattern snapshots

These endpoints do not expose another user's private activity.

## Authentication boundary

`getAuthenticatedUser()` resolves the session subject back to an active database user and rejects users with unsupported roles. This means deactivating a database user invalidates access even if an existing JWT remains present.

## Concurrency-sensitive mutations

- Plans have a database uniqueness constraint for user + doctor + planned time.
- Targets have a database uniqueness constraint for user + period.
- Mutation code also handles duplicate-key races with controlled conflict responses where applicable.

## Review conclusion

No cross-user read or write path was identified in the reviewed application API surface. Role-specific business restrictions remain intentionally undefined where the product requirements have not yet established them; they should be introduced only when the corresponding business policy is defined.
