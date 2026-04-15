import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { doRequest } from '../src/request.js';
import { VatverifyError, TimeoutError, NetworkError } from '../src/errors.js';

const BASE = 'https://api.example.com';
const AUTH = 'Bearer vtv_test_key';

describe('doRequest — baseline', () => {
  let originalFetch: typeof globalThis.fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the parsed JSON body on 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true }, meta: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const out = await doRequest({
      method: 'GET',
      url: `${BASE}/v1/validate`,
      headers: { Authorization: AUTH },
      timeout_ms: 30_000,
      max_retries: 0,
      fetch_impl: globalThis.fetch,
    });
    expect(out).toEqual({ data: { ok: true }, meta: {} });
  });

  it('sends Authorization header and custom User-Agent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    await doRequest({
      method: 'POST',
      url: `${BASE}/v1/decide`,
      headers: { Authorization: AUTH, 'User-Agent': '@vatverify/node/0.1.0 node/22.0.0' },
      body: JSON.stringify({ seller_vat: 'DE1', buyer_vat: 'FR1' }),
      timeout_ms: 30_000,
      max_retries: 0,
      fetch_impl: fetchMock,
    });
    const call = fetchMock.mock.calls[0]!;
    const urlArg = call[0] as string;
    const initArg = call[1] as RequestInit;
    expect(urlArg).toBe(`${BASE}/v1/decide`);
    const headers = new Headers(initArg.headers);
    expect(headers.get('authorization')).toBe(AUTH);
    expect(headers.get('user-agent')).toMatch(/^@vatverify\/node\/0\.1\.0/);
  });

  it('throws TimeoutError when fetch is aborted by timeout', async () => {
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });
    await expect(
      doRequest({
        method: 'GET',
        url: `${BASE}/slow`,
        headers: { Authorization: AUTH },
        timeout_ms: 10,
        max_retries: 0,
        fetch_impl: globalThis.fetch,
      }),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it('throws NetworkError when fetch rejects with a generic error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(
      doRequest({
        method: 'GET',
        url: `${BASE}/down`,
        headers: { Authorization: AUTH },
        timeout_ms: 30_000,
        max_retries: 0,
        fetch_impl: globalThis.fetch,
      }),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws typed VatverifyError on 4xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'unauthorized', message: 'bad key' },
          meta: { request_id: 'req_1' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );
    await expect(
      doRequest({
        method: 'GET',
        url: `${BASE}/v1/validate`,
        headers: { Authorization: AUTH },
        timeout_ms: 30_000,
        max_retries: 0,
        fetch_impl: globalThis.fetch,
      }),
    ).rejects.toBeInstanceOf(VatverifyError);
  });

  it('propagates an external AbortSignal (throws TimeoutError)', async () => {
    const controller = new AbortController();
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    });
    setTimeout(() => controller.abort(), 10);
    await expect(
      doRequest({
        method: 'GET',
        url: `${BASE}/v1/validate`,
        headers: { Authorization: AUTH },
        timeout_ms: 30_000,
        max_retries: 0,
        fetch_impl: globalThis.fetch,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it('attempt_count on errors is 1 with max_retries=0', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'invalid_format', message: 'x' }, meta: {} }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    try {
      await doRequest({
        method: 'GET',
        url: `${BASE}/v1/validate`,
        headers: { Authorization: AUTH },
        timeout_ms: 30_000,
        max_retries: 0,
        fetch_impl: globalThis.fetch,
      });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as VatverifyError).attempt_count).toBe(1);
    }
  });
});
