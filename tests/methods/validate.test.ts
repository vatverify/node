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

  it('respects per-request timeout override', async () => {
    const fetch = mockFetch(200, {
      data: { valid: true, vat_number: 'DE811569869', country: { code: 'DE', name: 'Germany', vat: null }, company: null, verify_id: null, verified_at: '2026-04-15T10:00:00Z' },
      meta: { request_id: 'req_x', latency_ms: 50, cached: false, source: 'vies', source_status: 'live' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, timeout: 30_000 });
    // Should not throw — we're just verifying the param is accepted by TypeScript and passed through
    await client.validate({ vat_number: 'DE811569869' }, { request_options: { timeout: 5_000 } });
    expect(fetch).toHaveBeenCalledOnce();
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

  it('sends requester_vat_number in the request body', async () => {
    const fetch = mockFetch(200, {
      data: {
        summary: { total: 2, successful: 2, failed: 0 },
        results: [
          { ok: true, data: { valid: true, vat_number: 'IE6388047V', country: { code: 'IE', name: 'Ireland', vat: null }, company: { name: 'Apple' }, verify_id: 'VIES-CONS-12345', verified_at: '2026-04-15T10:00:00Z' } },
          { ok: true, data: { valid: true, vat_number: 'FR44732829320', country: { code: 'FR', name: 'France', vat: null }, company: null, verify_id: 'VIES-CONS-67890', verified_at: '2026-04-15T10:00:00Z' } },
        ],
      },
      meta: { request_id: 'req_b2', latency_ms: 400, cached: false, source: 'vies', source_status: 'live' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const { data } = await client.validateBatch({
      vat_numbers: ['IE6388047V', 'FR44732829320'],
      requester_vat_number: 'DE811569869',
    });
    const initArg = fetch.mock.calls[0]![1] as RequestInit;
    expect(initArg.body).toBe(
      JSON.stringify({ vat_numbers: ['IE6388047V', 'FR44732829320'], requester_vat_number: 'DE811569869' }),
    );
    // Each EU item should carry a verify_id in the response
    const results = data.results;
    expect(results[0]!.ok).toBe(true);
    if (results[0]!.ok) expect(results[0]!.data.verify_id).toBe('VIES-CONS-12345');
    expect(results[1]!.ok).toBe(true);
    if (results[1]!.ok) expect(results[1]!.data.verify_id).toBe('VIES-CONS-67890');
  });

  it('handles partial success — mix of ok and failed items', async () => {
    const fetch = mockFetch(200, {
      data: {
        summary: { total: 3, successful: 2, failed: 1 },
        results: [
          { ok: true, data: { valid: true, vat_number: 'DE811569869', country: { code: 'DE', name: 'Germany', vat: null }, company: null, verify_id: null, verified_at: '2026-04-15T10:00:00Z' } },
          { ok: false, error: { code: 'invalid_format', message: 'Cannot determine country prefix for ZZ123' } },
          { ok: true, data: { valid: false, vat_number: 'FR00000000000', country: { code: 'FR', name: 'France', vat: null }, company: null, verify_id: null, verified_at: '2026-04-15T10:00:00Z' } },
        ],
      },
      meta: { request_id: 'req_mix', latency_ms: 350, cached: false, source: 'vies', source_status: 'live' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const { data } = await client.validateBatch({ vat_numbers: ['DE811569869', 'ZZ123', 'FR00000000000'] });
    expect(data.summary.total).toBe(3);
    expect(data.summary.successful).toBe(2);
    expect(data.summary.failed).toBe(1);
    const [first, second, third] = data.results;
    expect(first!.ok).toBe(true);
    if (first!.ok) expect(first!.data.valid).toBe(true);
    expect(second!.ok).toBe(false);
    if (!second!.ok) expect(second!.error.code).toBe('invalid_format');
    expect(third!.ok).toBe(true);
    if (third!.ok) expect(third!.data.valid).toBe(false);
  });

  it('throws PlanError when server returns 402', async () => {
    const fetch = mockFetch(
      402,
      { error: { code: 'plan_required', message: 'needs Pro' }, meta: { request_id: 'req_1' } },
    );
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(client.validateBatch({ vat_numbers: ['DE1'] })).rejects.toBeInstanceOf(PlanError);
  });

  it('throws ValidationError on batch_too_large (400)', async () => {
    const fetch = mockFetch(
      400,
      { error: { code: 'batch_too_large', message: 'Max 50 items' }, meta: { request_id: 'req_1' } },
    );
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(client.validateBatch({ vat_numbers: Array(51).fill('DE1') })).rejects.toBeInstanceOf(ValidationError);
  });
});
