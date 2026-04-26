# Changelog

All notable changes to `@vatverify/node` are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.1] — 2026-04-26

### Changed
- **README**: added 🇩🇪 Germany / BZSt eVatR to the registry flag list with a `client.confirm()` clarifier (BZSt is the §18e qualified-confirmation path, not regular validation).

### Security
- Bumped transitive dev dependency `postcss` to 8.5.10 to close GHSA / CVE-2026-41305 (XSS via unescaped `</style>` in CSS stringify output). Dev-only (via `tsup` + `vitest`); the SDK runtime is unaffected.

## [0.2.0] — 2026-04-26

### Added
- **`client.confirm(input)`** — BZSt §18e qualified VAT confirmation for German sellers. Returns per-field A/B/C/D match grid (name / street / postcode / town), the BZSt status code, and a 10-year-retention `confirmation_id`. Business plan only.
- **`client.confirmations.get(id)`** — retrieve a stored §18e confirmation record by id. Idempotency-key replays return the same record for 24h.
- **`bzst_id` field** on `ConfirmResponse.meta` and `ConfirmationRecord` — BZSt's own request identifier from the eVatR response, surfaced as a third immutable evidence reference alongside `request_id` and `confirmation_id`. Strengthens the §18e evidence chain.
- New typed error classes for BZSt-specific failure modes: `BzstSessionLimitError`, `BzstUnavailableError`, `BzstRejectedError`. All extend `VatverifyError` and are importable from the main entry (also available at `@vatverify/node/errors`).

### Notes
- Response shape verified against a live `evatr-0000` capture from BZSt's documented test pair (`DE123456789` + `ATU12345678` + Musterhaus envelope).

## [0.1.0] — 2026-04-16

### Added
- Full public surface — `Vatverify` class with `validate`, `validateBatch`, `decide`, `rates.list`, `rates.get`, `health` methods.
- Cross-runtime support: Node 18+, Bun, Deno, Vercel Edge, Cloudflare Workers. Zero runtime dependencies.
- Structured error hierarchy: `VatverifyError` base + `AuthError`, `ValidationError`, `NotFoundError`, `RateLimitError`, `RegistryError`, `PlanError`, `NetworkError`, `TimeoutError`. Each carries `code`, `status_code`, `request_id`, `response_body`, `attempt_count`. `RateLimitError` additionally carries `retry_after` + `rate_limit`.
- 2-retry default with exponential backoff + jitter (100ms → 400ms → 1600ms, capped 2s). Honors `Retry-After` on 429 (capped 30s). Retries only on network/timeout/429/502/503/504.
- Auto-generated types from the production OpenAPI spec via `openapi-typescript`. Zero drift by design.
- Response hook (`on_response`) for logging / observability. No `on_request` hook (privacy — headers contain the API key).
- Runtime detection in User-Agent (`@vatverify/node/0.1.0 node/22.0.0` etc.).
- CI matrix: Node 18/20/22 + Bun + Deno + Vercel Edge. Cloudflare Workers runtime deferred to post-v0.1.

[0.1.0]: https://github.com/vatverify/node/releases/tag/v0.1.0
