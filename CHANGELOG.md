# Changelog

All notable changes to `@vatverify/node` are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project adheres to [Semantic Versioning](https://semver.org/).

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
