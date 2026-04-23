# @vatverify/node

[![npm](https://img.shields.io/npm/v/@vatverify/node.svg)](https://www.npmjs.com/package/@vatverify/node)
[![types](https://img.shields.io/npm/types/@vatverify/node.svg)](https://www.npmjs.com/package/@vatverify/node)
[![license](https://img.shields.io/npm/l/@vatverify/node.svg)](./LICENSE)
[![downloads](https://img.shields.io/npm/dm/@vatverify/node.svg)](https://www.npmjs.com/package/@vatverify/node)

Official TypeScript + Node.js SDK for the [vatverify](https://vatverify.dev) VAT validation API. VIES goes down on Tuesdays, HMRC rate-limits, and the Swiss UID register speaks SOAP. One typed client handles all three.

- 🇪🇺 **EU-27** via VIES
- 🇬🇧 **UK** via HMRC
- 🇨🇭 **Switzerland / Liechtenstein** via BFS (UID register)
- 🇳🇴 **Norway** via Brønnøysundregistrene
- Freshness-aware responses (`live` / `cached` / `degraded`) so a registry outage never 502s your checkout
- `/decide` tax-rules engine for reverse-charge invoice decisions
- Runs on Node.js 18+, Bun, Deno, Vercel Edge, and Cloudflare Workers, with zero runtime dependencies

```bash
npm install @vatverify/node
```

## Supported registries

| Country | Registry | Transport |
|---|---|---|
| EU-27 | VIES | SOAP |
| XI (Northern Ireland) | VIES | SOAP |
| UK (GB) | HMRC | REST |
| CH / LI | BFS (Swiss UID) | SOAP |
| NO | Brønnøysundregistrene | REST |

Live rolling 30-day uptime and p50/p95 latency per registry: [vatverify.dev/status](https://vatverify.dev/status). All numbers come from the public `GET /v1/status.json` endpoint, with no made-up SLAs.

Northern Ireland VATs use the `XI` prefix under the Brexit protocol; they validate through VIES like any EU member. `GB` numbers route to HMRC.

## Quick start

```ts
import { Vatverify } from '@vatverify/node';

const client = new Vatverify('vtv_live_...');

const { data, meta } = await client.validate({ vat_number: 'IE6388047V' });
console.log(data.valid, data.company?.name);
console.log('latency:', meta.latency_ms, 'ms');
console.log('freshness:', meta.source_status); // 'live' | 'cached' | 'degraded'
```

Get an API key at [vatverify.dev](https://vatverify.dev). Free tier: 500 live validations / month plus unlimited test-mode calls, no credit card.

## Validation

### `client.validate(input)`

Validate a single VAT number. Available on every plan.

```ts
const { data, meta } = await client.validate({
  vat_number: 'IE6388047V',
  cache: false,                           // optional: bypass the 30-day cache
  requester_vat_number: 'DE100000001',    // optional: consultation number / audit trail
});
```

### `client.validateBatch(input)`

Validate up to 50 VAT numbers in one request. Requires the **Pro** or **Business** plan.

```ts
const { data, meta } = await client.validateBatch({
  vat_numbers: ['IE6388047V', 'DE811569869', 'FR44732829320'],
});
console.log(`${data.summary.successful}/${data.summary.total} succeeded`);
for (const item of data.results) {
  if (item.ok) console.log(item.data.vat_number, '→', item.data.valid);
  else console.log('error:', item.error.code, item.error.message);
}
```

## Tax decisions: `/decide`

The differentiator. Answers "should I charge VAT on this invoice, or is it reverse-charge / out-of-scope?" and returns the legal basis plus the exact `invoice_note` string to print on the invoice. Requires the **Business** plan.

```ts
// DE seller → FR B2B buyer: intra-EU reverse charge
const { data } = await client.decide({
  seller_vat: 'DE123456789',
  buyer_vat: 'FR44732829320',
});
data.mechanism;    // 'reverse_charge'
data.invoice_note; // 'Reverse charge: VAT to be accounted for by the recipient (Art. 196 VAT Directive).'
data.legal_basis;  // 'EU Directive 2006/112/EC, Art. 196'
```

```ts
// DE seller → DE B2B buyer: domestic, standard VAT
await client.decide({ seller_vat: 'DE123456789', buyer_vat: 'DE811569869' });
// → { mechanism: 'standard', rate: 19, ... }
```

```ts
// DE seller → non-EU buyer: out of scope
await client.decide({ seller_vat: 'DE123456789', buyer_country: 'US' });
// → { mechanism: 'out_of_scope', invoice_note: '...' }
```

`mechanism` is one of `'standard'`, `'reverse_charge'`, `'zero_rated'`, `'out_of_scope'`. Both VATs are validated against their live registries in the same call, so you get validation + decision for one quota unit, pooled with `/validate`.

## Rates

```ts
const { data } = await client.rates.list();
console.log(`${data.length} countries`);

const { data: de } = await client.rates.get('de');
console.log(de.standard_rate, de.currency);  // 19 EUR
```

Rates endpoints are public, no auth required. For fully offline rates plus format/checksum validation (no API call at all), use [`@vatverify/vat-rates`](https://www.npmjs.com/package/@vatverify/vat-rates) instead.

## Reliability

Every registry fails in its own way. The SDK and API surface what's happening so your code can respond:

- **`meta.source_status: 'live'`**: fresh response from the registry.
- **`meta.source_status: 'cached'`**: served from the 30-day cache (within freshness window).
- **`meta.source_status: 'degraded'`**: the registry failed live, so the response was served from the fallback cache window. The VAT is still validated, but treat the answer as "last known good" rather than real-time.

This means a VIES outage doesn't break your checkout: the request returns a `degraded` response instead of a 502. The public status page ([vatverify.dev/status](https://vatverify.dev/status)) shows the live state of every registry.

### Retries

The SDK retries on network errors, timeouts, `429`, `502`, `503`, and `504`: up to 2 retries (3 total attempts), exponential backoff with jitter, capped at 2s. `Retry-After` on `429` takes precedence (capped at 30s). Retries never fire on `400`, `401`, `402`, `404`, which are caller errors.

```ts
// disable retries globally or per request
const client = new Vatverify({ api_key: '...', max_retries: 0 });
await client.validate(input, {
  request_options: { max_retries: 0, timeout: 5000, signal: controller.signal },
});
```

## Test mode

Test keys (`vtv_test_...`) exercise the full API deterministically without consuming quota or hitting registries:

```ts
const client = new Vatverify('vtv_test_...');

await client.validate({ vat_number: 'IE6388047V' });    // valid, Apple Distribution International Ltd
await client.validate({ vat_number: 'DE811569869' });   // valid, Zalando SE
await client.validate({ vat_number: 'FR44732829320' }); // valid, BlaBlaCar SAS
await client.validate({ vat_number: 'IE0000000X' });    // invalid, no company data
await client.validate({ vat_number: 'DE999999999' });   // 502 registry_unavailable
// any other well-formed VAT → valid, synthesized "Magic Corp (XX)"
```

Full fixture list at [vatverify.dev/docs/test-mode](https://vatverify.dev/docs/test-mode). Test-mode calls are unlimited on every plan including free.

## Configuration

```ts
// string shorthand (common case)
const client = new Vatverify('vtv_live_...');

// or full config
const client = new Vatverify({
  api_key: 'vtv_live_...',
  base_url: 'https://api.vatverify.dev', // default
  timeout: 30_000,                        // default: 30s per attempt
});

// or VATVERIFY_API_KEY env var
const client = new Vatverify();
```

Advanced options (`max_retries`, `fetch`, `user_agent_extra`, `on_response` hook) are documented at [vatverify.dev/docs/sdks/node](https://vatverify.dev/docs/sdks/node).

## Error handling

```ts
import {
  VatverifyError,
  AuthError, ValidationError, NotFoundError, PlanError,
  RateLimitError, RegistryError, NetworkError, TimeoutError,
} from '@vatverify/node';

try {
  await client.validate({ vat_number: 'xxx' });
} catch (e) {
  if (e instanceof RateLimitError) {
    console.log(`Retry after ${e.retry_after}s; remaining: ${e.rate_limit.remaining}`);
  } else if (e instanceof RegistryError) {
    console.log('Upstream registry failed; response was served degraded or unavailable');
  } else if (e instanceof AuthError) {
    console.log('Rotate the API key');
  } else if (e instanceof VatverifyError) {
    console.log(e.code, e.status_code, e.request_id, e.attempt_count);
  }
}
```

Every error exposes `code`, `status_code`, `request_id` (quote this in support tickets), `response_body`, and `attempt_count`. `RateLimitError` additionally carries `retry_after` and `rate_limit: { limit, remaining, reset }`.

## Runtime support

| Runtime | Supported |
|---|---|
| Node.js 18+ | ✅ |
| Bun | ✅ |
| Deno | ✅ |
| Vercel Edge | ✅ |
| Cloudflare Workers | ✅ |
| Browsers (direct API key) | ❌ (API keys must stay server-side) |

Zero runtime dependencies. Uses only `fetch`, `AbortController`, `URL`, `Headers`.

## TypeScript

Types ship with the package and are auto-generated from the production OpenAPI spec. Every method is fully typed end-to-end:

```ts
import type { ValidateResponse, CountryRate, BatchResultItem, DecideResponse } from '@vatverify/node';
```

## License

MIT. See [LICENSE](./LICENSE).

## Links

- Documentation: https://vatverify.dev/docs
- Status: https://vatverify.dev/status
- Issues: https://github.com/vatverify/node/issues
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
