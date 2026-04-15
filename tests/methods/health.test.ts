import { describe, it, expect, vi } from 'vitest';
import { Vatverify } from '../../src/client.js';

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
});
