import { describe, it, expect, vi } from 'vitest';
import { Vatverify } from '../../src/client.js';
import { NotFoundError } from '../../src/errors.js';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('client.rates.list', () => {
  it('GETs /v1/rates and returns an array in data', async () => {
    const fetch = mockFetch(200, {
      data: [
        { country_code: 'de', country_name: 'Germany' },
        { country_code: 'fr', country_name: 'France' },
      ],
      meta: { request_id: 'req_r', data_version: '2026-04-13', cached: true, count: 2 },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const { data, meta } = await client.rates.list();
    expect(data).toHaveLength(2);
    expect(meta.count).toBe(2);
    const urlArg = fetch.mock.calls[0]![0] as string;
    expect(urlArg).toContain('/v1/rates');
  });
});

describe('client.rates.get', () => {
  it('GETs /v1/rates/de for a single country', async () => {
    const fetch = mockFetch(200, {
      data: { country_code: 'de', country_name: 'Germany', standard_rate: 19 },
      meta: { request_id: 'req_r', data_version: '2026-04-13', cached: true },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const { data } = await client.rates.get('de');
    expect(data.country_code).toBe('de');
    expect(data.standard_rate).toBe(19);
    const urlArg = fetch.mock.calls[0]![0] as string;
    expect(urlArg).toMatch(/\/v1\/rates\/de$/);
  });

  it('lowercases the country code in the URL (case-insensitive)', async () => {
    const fetch = mockFetch(200, {
      data: { country_code: 'de' },
      meta: { request_id: 'req_r', data_version: '2026-04-13', cached: true },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    await client.rates.get('DE');
    const urlArg = fetch.mock.calls[0]![0] as string;
    expect(urlArg).toMatch(/\/v1\/rates\/de$/);
  });

  it('throws NotFoundError on 404', async () => {
    const fetch = mockFetch(404, {
      error: { code: 'country_unknown', message: 'xy not found' },
      meta: { request_id: 'req_r' },
    });
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(client.rates.get('xy')).rejects.toBeInstanceOf(NotFoundError);
  });
});
