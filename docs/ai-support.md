# MR 3.0 AI Support

AI Support is an optional integration. The core MR 3.0 workflows do not depend on a paid AI provider.

## Default production state

AI Support is disabled unless the server explicitly sets:

`AI_SUPPORT_ENABLED=true`

The default is disabled. This prevents an accidentally configured provider key from activating paid AI traffic.

The browser can read the current capability state from authenticated `GET /api/metadata` under:

`aiSupport.enabled`

The UI can therefore switch from the Coming Soon state to the live assistant without changing the data model when the feature is intentionally activated.

## Without an AI provider

Leave `AI_SUPPORT_ENABLED`, `OPENAI_API_KEY`, and `OPENAI_MODEL` unset. The authenticated application remains usable for:

- Doctor Explorer
- Doctor Potential
- Calls
- My Plan
- Samples
- Targets
- Reports
- Notifications
- Stockist Data

The AI Support API returns a controlled `503` Coming Soon response while the feature flag is disabled rather than consuming rate-limit capacity or calling a provider.

## When AI is enabled

Set:

- `AI_SUPPORT_ENABLED=true`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

The API key is server-side only. It is never exposed to the browser.

`OPENAI_BASE_URL` can point to another OpenAI-compatible Responses API endpoint. This keeps the application provider-configurable instead of hard-coding a paid vendor into the product.

## Cost-control policy

Do not make AI provider spending a prerequisite for production deployment.

If AI is not funded yet, ship MR 3.0 with AI Support disabled and enable it later after selecting a provider and setting an explicit budget/rate policy.

The existing per-user PostgreSQL rate limiter remains active for enabled AI requests.
