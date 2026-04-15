import { describe, it, expect, vi } from 'vitest';
import { Vatverify } from '../../src/client.js';
import { VatverifyError } from '../../src/errors.js';

describe('client.health', () => {
  it('GETs /health and returns { ok: true }', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch });
    const out = await client.health();
    expect(out).toEqual({ ok: true });
    const urlArg = fetch.mock.calls[0]![0] as string;
    expect(urlArg).toMatch(/\/health$/);
  });

  it('throws on 5xx when the API is down', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'registry_unavailable', message: 'Service unavailable' }, meta: { request_id: 'req_h' } }),
        { status: 503, headers: { 'content-type': 'application/json' } },
      ),
    );
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch, max_retries: 0 });
    await expect(client.health()).rejects.toBeInstanceOf(VatverifyError);
  });
});
