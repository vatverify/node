// Runs under Deno via `deno test --allow-net`. Uses Deno.test API.
import { Vatverify } from '../../src/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

Deno.test('Deno runtime smoke: validate', async () => {
  const fetch = (async () =>
    new Response(
      JSON.stringify({
        data: { valid: true, vat_number: 'IE1', country: { code: 'IE', name: 'Ireland', vat: null }, company: null, verify_id: null, verified_at: '2026-04-15T10:00:00Z' },
        meta: { request_id: 'r', latency_ms: 1, cached: false, source: 'vies', source_status: 'live' },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as unknown as typeof globalThis.fetch;

  const client = new Vatverify({ api_key: 'vtv_test_x', fetch });
  const { data } = await client.validate({ vat_number: 'IE1' });
  if (!data.valid) throw new Error('expected valid=true');
});
