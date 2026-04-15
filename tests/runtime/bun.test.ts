// Runs under Bun via `bun test`. Uses bun:test API (NOT vitest).
import { describe, it, expect } from 'bun:test';
import { Vatverify } from '../../src/index.js';

describe('Bun runtime smoke', () => {
  it('instantiates + calls validate against a mocked fetch', async () => {
    const fetch = (async () =>
      new Response(
        JSON.stringify({
          data: { valid: true, vat_number: 'IE1', country: { code: 'IE', name: 'Ireland', vat: null }, company: null, verify_id: null, verified_at: '2026-04-15T10:00:00Z' },
          meta: { request_id: 'r', latency_ms: 1, cached: false, source: 'vies', source_status: 'live' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )) as unknown as typeof fetch;

    const client = new Vatverify({ api_key: 'vtv_test_x', fetch });
    const { data } = await client.validate({ vat_number: 'IE1' });
    expect(data.valid).toBe(true);
  });
});
