# Changelog

All notable changes to `@vatverify/node` are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - TBD

### Added
- Initial release.
- `Vatverify` class with `validate`, `validateBatch`, `decide`, `rates.list`, `rates.get`, `health` methods.
- Cross-runtime support: Node 18+, Bun, Deno, Vercel Edge, Cloudflare Workers.
- Structured error hierarchy: `VatverifyError` base + `AuthError`, `ValidationError`, `NotFoundError`, `RateLimitError`, `RegistryError`, `PlanError`, `NetworkError`, `TimeoutError`.
- 2-retry default with exponential backoff + jitter, honoring `Retry-After`.
- Auto-generated types from the production OpenAPI spec.
