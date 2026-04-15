import { describe, it, expect, vi } from 'vitest';
import { Vatverify } from '../../src/client.js';
import { PlanError, ValidationError } from '../../src/errors.js';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('client.decide', () => {
  it('POSTs /v1/decide with body', async () => {
    const fetch = mockFetch(200, {
      data: {
        charge_vat: false,
        rate: 0,
        mechanism: 'reverse_charge',
        legal_basis: 'Article 196',
        explanation: 'x',
        invoice_note: 'y',
        buyer_vat: { valid: true, country: { code: 'FR', name: 'France' }, company: null },
        validated_at: '2026-04-15T10:00:00Z',
      },
      meta: { request_id: 'req_d', latency_ms: 300 },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const { data, meta } = await client.decide({
      seller_vat: 'DE123456789',
      buyer_vat: 'FR44732829320',
    });
    expect(data.mechanism).toBe('reverse_charge');
    expect(meta.request_id).toBe('req_d');
    const initArg = fetch.mock.calls[0]![1] as RequestInit;
    expect(initArg.method).toBe('POST');
    const urlArg = fetch.mock.calls[0]![0] as string;
    expect(urlArg).toContain('/v1/decide');
    expect(initArg.body).toBe(JSON.stringify({ seller_vat: 'DE123456789', buyer_vat: 'FR44732829320' }));
  });

  it('throws PlanError (402) when called without a Business plan', async () => {
    const fetch = mockFetch(402, {
      error: { code: 'plan_required', message: 'Business plan required for /v1/decide' },
      meta: { request_id: 'req_d2' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(client.decide({ seller_vat: 'DE123456789', buyer_vat: 'FR44732829320' }))
      .rejects.toBeInstanceOf(PlanError);
  });

  it('throws ValidationError (400) when buyer VAT is not registered', async () => {
    const fetch = mockFetch(400, {
      error: { code: 'buyer_vat_not_registered', message: 'Buyer VAT is not a registered business' },
      meta: { request_id: 'req_d3' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(client.decide({ seller_vat: 'DE123456789', buyer_vat: 'FR00000000000' }))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError (400) for seller_country_unsupported', async () => {
    const fetch = mockFetch(400, {
      error: { code: 'seller_country_unsupported', message: 'Seller country not in EU-27' },
      meta: { request_id: 'req_d4' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(client.decide({ seller_vat: 'GB123456789', buyer_vat: 'FR44732829320' }))
      .rejects.toBeInstanceOf(ValidationError);
  });
});
