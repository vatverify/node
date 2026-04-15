# @vatverify/node

Official Node.js client for the [vatverify](https://vatverify.dev) API.

Validate VAT numbers, fetch VAT rates, and run tax-rules decisions across the EU-27, UK, Switzerland, Liechtenstein, Norway, and more — all with a single typed client. Works in Node.js 18+, Bun, Deno, Vercel Edge, and Cloudflare Workers.

```bash
npm install @vatverify/node
```

## Quick start

```ts
import { Vatverify } from '@vatverify/node';

const client = new Vatverify('vtv_live_...');

const { data, meta } = await client.validate({ vat_number: 'IE6388047V' });
console.log(data.valid, data.company?.name);
console.log('latency:', meta.latency_ms, 'ms');
```

Get an API key at [vatverify.dev](https://vatverify.dev). Free tier: 500 validations + 25 `/decide` calls / month, no credit card.

## Methods

### `client.validate(input)`

Validate a single VAT number. Available on every plan.

```ts
const { data, meta } = await client.validate({
  vat_number: 'IE6388047V',
  cache: false,                           // optional: bypass the 30-day cache
  requester_vat_number: 'DE100000001',    // optional: for audit trail (verify_id)
});
```

### `client.validateBatch(input)`

Validate up to 50 VAT numbers in one request. Requires **Pro** or **Business** plan.

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

### `client.decide(input)`

Tax-rules engine. Answers "should I charge VAT?" with legal basis and invoice note. Included on every plan (Free gets 25 calls/month).

```ts
const { data } = await client.decide({
  seller_vat: 'DE123456789',
  buyer_vat: 'FR44732829320',
});
console.log(data.mechanism);        // 'reverse_charge' | 'standard'
console.log(data.invoice_note);     // "Reverse charge — VAT to be accounted for..."
```

### `client.rates.list()` · `client.rates.get(country)`

Fetch VAT rates. Public, no auth required — but calling them through the client is more ergonomic (typed responses).

```ts
const { data } = await client.rates.list();
console.log(`${data.length} countries`);

const { data: de } = await client.rates.get('de');
console.log(de.standard_rate, de.currency);  // 19 EUR
```

### `client.health()`

Liveness probe. Returns `{ ok: true }` when the API is up.

```ts
const { ok } = await client.health();
```

## Configuration

```ts
// Option 1: string shorthand (common case)
const client = new Vatverify('vtv_live_...');

// Option 2: full config object
const client = new Vatverify({
  api_key: 'vtv_live_...',
  base_url: 'https://api.vatverify.dev',   // default; override for staging
  timeout: 30_000,                          // default: 30s per attempt
  max_retries: 2,                           // default: 2 retries (3 attempts total)
  fetch: globalThis.fetch,                  // override for custom transports
  user_agent_extra: 'my-app/1.2.3',         // appended to default UA
  on_response: (info) => log.info(info),    // hook for request/response logging
});

// Option 3: environment variable
// $ export VATVERIFY_API_KEY=vtv_live_...
const client = new Vatverify();
```

## Error handling

```ts
import {
  Vatverify,
  VatverifyError,
  AuthError,
  ValidationError,
  NotFoundError,
  PlanError,
  RateLimitError,
  RegistryError,
  NetworkError,
  TimeoutError,
} from '@vatverify/node';

try {
  const { data } = await client.validate({ vat_number: 'xxx' });
} catch (e) {
  if (e instanceof RateLimitError) {
    console.log(`Retry after ${e.retry_after}s; remaining: ${e.rate_limit.remaining}`);
  } else if (e instanceof AuthError) {
    console.log('Rotate the API key');
  } else if (e instanceof VatverifyError) {
    console.log(e.code, e.status_code, e.request_id, e.attempt_count);
  }
}
```

Every error has:
- `code` — machine-readable identifier (e.g. `'invalid_format'`, `'rate_limited'`)
- `status_code` — HTTP status, or `0` for network / timeout errors
- `request_id` — UUID for support tickets
- `response_body` — raw response for debugging
- `attempt_count` — how many attempts were made before this error was thrown

`RateLimitError` additionally carries `retry_after` (seconds) and `rate_limit: { limit, remaining, reset }`.

## Retries

By default the SDK retries on network errors, timeouts, `429`, `502`, `503`, and `504` — up to 2 retries (3 total attempts), with exponential backoff + jitter capped at 2 seconds. `Retry-After` on `429` takes precedence over backoff (capped at 30s).

Retries don't fire on `400`, `401`, `402`, `404` — those are caller errors and retrying wouldn't help.

```ts
// disable retries
const client = new Vatverify({ api_key: '...', max_retries: 0 });

// or per request
await client.validate(input, {
  request_options: { max_retries: 0, timeout: 5000, signal: controller.signal },
});
```

## Runtime support

| Runtime | Supported |
|---|---|
| Node.js 18+ | ✅ |
| Bun | ✅ |
| Deno | ✅ |
| Vercel Edge | ✅ |
| Cloudflare Workers | ✅ |
| Browsers (direct API key) | ❌ (API keys must stay server-side) |

Zero runtime dependencies. Uses only `fetch`, `AbortController`, `URL`, `Headers` — standard Web APIs available in every modern runtime.

## TypeScript

Types ship with the package and are auto-generated from the production OpenAPI spec. Every method is fully typed:

```ts
import type { ValidateResponse, CountryRate, BatchResultItem } from '@vatverify/node';
```

## License

MIT — see [LICENSE](./LICENSE).

## Links

- Documentation: https://vatverify.dev/docs
- Issues: https://github.com/vatverify/node/issues
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
