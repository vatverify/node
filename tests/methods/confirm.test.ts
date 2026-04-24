import { describe, it, expect, vi } from 'vitest';
import { Vatverify } from '../../src/client.js';
import {
  PlanError,
  BzstSessionLimitError,
  BzstUnavailableError,
  BzstRejectedError,
} from '../../src/errors.js';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

const OK_RESPONSE = {
  data: {
    valid: true,
    qualified: true,
    vat_number: 'FR44732829320',
    requester_vat_number: 'DE811569869',
    matches: { name: 'A', street: 'A', postcode: 'A', town: 'A' },
    company: { name: 'Airbus', street: 'x', postcode: '31000', town: 'Toulouse' },
    valid_from: '2020-01-01',
    valid_to: null,
    confirmation_id: '11111111-1111-1111-1111-111111111111',
    confirmed_at: '2026-04-24T10:00:00Z',
  },
  meta: {
    source: 'bzst',
    source_status: 'live',
    latency_ms: 1234,
    request_id: '22222222-2222-2222-2222-222222222222',
    bzst_status_code: 'evatr-0000',
  },
};

describe('client.confirm', () => {
  it('POSTs /v1/confirm with body and returns typed result', async () => {
    const fetch = mockFetch(200, OK_RESPONSE);
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const { data, meta } = await client.confirm({
      vat_number: 'FR44732829320',
      company: { name: 'Airbus', postcode: '31000' },
    });
    expect(data.qualified).toBe(true);
    expect(data.matches.name).toBe('A');
    expect(data.confirmation_id).toBe('11111111-1111-1111-1111-111111111111');
    expect(meta.bzst_status_code).toBe('evatr-0000');
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toContain('/v1/confirm');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('forwards Idempotency-Key header when supplied', async () => {
    const fetch = mockFetch(200, OK_RESPONSE);
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    await client.confirm(
      { vat_number: 'FR44732829320', company: { name: 'Airbus' } },
      { idempotency_key: '33333333-3333-3333-3333-333333333333' },
    );
    const init = fetch.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('33333333-3333-3333-3333-333333333333');
  });

  it('throws PlanError on 402', async () => {
    const fetch = mockFetch(402, {
      error: { code: 'plan_required', message: 'Business required' },
      meta: { request_id: 'r' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(
      client.confirm({ vat_number: 'FR44732829320', company: { name: 'x' } }),
    ).rejects.toBeInstanceOf(PlanError);
  });

  it('throws BzstSessionLimitError on 429 with bzst_session_limit code', async () => {
    const fetch = mockFetch(429, {
      error: { code: 'bzst_session_limit', message: 'session exhausted' },
      meta: { request_id: 'r' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(
      client.confirm({ vat_number: 'FR44732829320', company: { name: 'x' } }),
    ).rejects.toBeInstanceOf(BzstSessionLimitError);
  });

  it('throws BzstUnavailableError on 503 with bzst_unavailable code', async () => {
    const fetch = mockFetch(503, {
      error: { code: 'bzst_unavailable', message: 'BZSt down' },
      meta: { request_id: 'r' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(
      client.confirm({ vat_number: 'FR44732829320', company: { name: 'x' } }),
    ).rejects.toBeInstanceOf(BzstUnavailableError);
  });

  it('throws BzstRejectedError on 400 with bzst_rejected code', async () => {
    const fetch = mockFetch(400, {
      error: { code: 'bzst_rejected', message: 'unknown evatr code' },
      meta: { request_id: 'r' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(
      client.confirm({ vat_number: 'FR44732829320', company: { name: 'x' } }),
    ).rejects.toBeInstanceOf(BzstRejectedError);
  });
});

describe('client.confirmations.get', () => {
  it('GETs /v1/confirmations/:id', async () => {
    const fetch = mockFetch(200, {
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        request_id: '22222222-2222-2222-2222-222222222222',
        requester_vat: 'DE811569869',
        queried_vat: 'FR44732829320',
        bzst_status_code: 'evatr-0000',
        valid: true,
        qualified: true,
        matches: { name: 'A', street: 'A', postcode: 'A', town: 'A' },
        result: { name: 'Airbus', street: null, postcode: null, town: null },
        valid_from: '2020-01-01',
        valid_to: null,
        created_at: '2026-04-24T10:00:00Z',
      },
      meta: { request_id: 'x' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const { data } = await client.confirmations.get('11111111-1111-1111-1111-111111111111');
    expect(data.qualified).toBe(true);
    const url = fetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v1/confirmations/11111111-1111-1111-1111-111111111111');
  });
});
