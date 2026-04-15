// Runs under Node 18/20/22 via the CI matrix.
import { describe, it, expect, vi } from 'vitest';
import { Vatverify } from '../../src/index.js';

describe('Node runtime smoke', () => {
  it('instantiates + calls validate against a mocked fetch', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { valid: true, vat_number: 'IE1', country: { code: 'IE', name: 'Ireland', vat: null }, company: null, verify_id: null, verified_at: '2026-04-15T10:00:00Z' },
          meta: { request_id: 'r', latency_ms: 1, cached: false, source: 'vies', source_status: 'live' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const client = new Vatverify({ api_key: 'vtv_test_x', fetch });
    const { data } = await client.validate({ vat_number: 'IE1' });
    expect(data.valid).toBe(true);
  });
});
