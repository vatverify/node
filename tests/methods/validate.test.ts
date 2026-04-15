import { describe, it, expect, vi } from 'vitest';
import { Vatverify } from '../../src/client.js';
import { ValidationError, PlanError } from '../../src/errors.js';

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    }),
  );
}

describe('client.validate', () => {
  it('sends GET /v1/validate?vat_number=...', async () => {
    const fetch = mockFetch(200, {
      data: { valid: true, vat_number: 'IE6388047V', country: { code: 'IE', name: 'Ireland', vat: null }, company: { name: 'G' }, verify_id: null, verified_at: '2026-04-15T10:00:00Z' },
      meta: { request_id: 'req_1', latency_ms: 100, cached: false, source: 'vies', source_status: 'live' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const { data, meta } = await client.validate({ vat_number: 'IE6388047V' });
    expect(data.valid).toBe(true);
    expect(meta.request_id).toBe('req_1');
    const urlArg = fetch.mock.calls[0]![0] as string;
    expect(urlArg).toContain('/v1/validate?vat_number=IE6388047V');
  });

  it('passes optional cache + requester_vat_number as query params', async () => {
    const fetch = mockFetch(200, { data: {}, meta: {} });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    await client.validate({
      vat_number: 'IE6388047V',
      cache: false,
      requester_vat_number: 'DE100000001',
    });
    const urlArg = fetch.mock.calls[0]![0] as string;
    const u = new URL(urlArg);
    expect(u.searchParams.get('vat_number')).toBe('IE6388047V');
    expect(u.searchParams.get('cache')).toBe('false');
    expect(u.searchParams.get('requester_vat_number')).toBe('DE100000001');
  });

  it('throws ValidationError on 400', async () => {
    const fetch = mockFetch(
      400,
      { error: { code: 'invalid_format', message: 'bad' }, meta: { request_id: 'req_1' } },
    );
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(client.validate({ vat_number: 'xxx' })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('client.validateBatch', () => {
  it('POSTs /v1/validate/batch with {vat_numbers: [...]}', async () => {
    const fetch = mockFetch(200, {
      data: {
        summary: { total: 2, successful: 2, failed: 0 },
        results: [
          { ok: true, data: { valid: true, vat_number: 'DE1', country: { code: 'DE', name: 'Germany', vat: null }, company: null, verify_id: null, verified_at: '2026-04-15T10:00:00Z' } },
          { ok: true, data: { valid: true, vat_number: 'IE1', country: { code: 'IE', name: 'Ireland', vat: null }, company: null, verify_id: null, verified_at: '2026-04-15T10:00:00Z' } },
        ],
      },
      meta: { request_id: 'req_b', latency_ms: 200, cached: false, source: 'vies', source_status: 'live' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const { data, meta } = await client.validateBatch({ vat_numbers: ['DE1', 'IE1'] });
    expect(data.summary.total).toBe(2);
    expect(data.results).toHaveLength(2);
    expect(meta.request_id).toBe('req_b');
    const initArg = fetch.mock.calls[0]![1] as RequestInit;
    expect(initArg.method).toBe('POST');
    const urlArg = fetch.mock.calls[0]![0] as string;
    expect(urlArg).toContain('/v1/validate/batch');
    expect(initArg.body).toBe(JSON.stringify({ vat_numbers: ['DE1', 'IE1'] }));
  });

  it('throws PlanError when server returns 402', async () => {
    const fetch = mockFetch(
      402,
      { error: { code: 'plan_required', message: 'needs Pro' }, meta: { request_id: 'req_1' } },
    );
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(client.validateBatch({ vat_numbers: ['DE1'] })).rejects.toBeInstanceOf(PlanError);
  });
});
