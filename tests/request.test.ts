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

describe('doRequest — retries', () => {
  let originalFetch: typeof globalThis.fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.useFakeTimers();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  async function advanceAll() {
    await vi.runAllTimersAsync();
  }

  it('retries on 502 up to max_retries', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'registry_unavailable' }, meta: {} }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'registry_unavailable' }, meta: {} }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { ok: true }, meta: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock;

    const p = doRequest({
      method: 'GET',
      url: `${BASE}/v1/validate`,
      headers: { Authorization: AUTH },
      timeout_ms: 30_000,
      max_retries: 2,
      fetch_impl: fetchMock,
    });
    await advanceAll();
    const out = await p;
    expect(out).toEqual({ data: { ok: true }, meta: {} });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries on network errors up to max_retries', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {}, meta: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock;

    const p = doRequest({
      method: 'GET',
      url: `${BASE}/v1/validate`,
      headers: { Authorization: AUTH },
      timeout_ms: 30_000,
      max_retries: 2,
      fetch_impl: fetchMock,
    });
    await advanceAll();
    await p;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 400/401/402/404', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'unauthorized' }, meta: {} }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock;
    const p = doRequest({
      method: 'GET',
      url: `${BASE}/v1/validate`,
      headers: { Authorization: AUTH },
      timeout_ms: 30_000,
      max_retries: 2,
      fetch_impl: fetchMock,
    });
    // No retries happen here — attach rejection handler BEFORE draining timers
    // so the rejection isn't flagged as unhandled mid-drain.
    const result = expect(p).rejects.toThrow();
    await advanceAll();
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honors Retry-After header on 429', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'rate_limited' }, meta: {} }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '2' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {}, meta: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock;

    const p = doRequest({
      method: 'GET',
      url: `${BASE}/v1/validate`,
      headers: { Authorization: AUTH },
      timeout_ms: 30_000,
      max_retries: 2,
      fetch_impl: fetchMock,
    });
    await vi.advanceTimersByTimeAsync(2000);
    await p;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('final error has attempt_count matching total attempts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'registry_unavailable' }, meta: {} }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock;
    const p = doRequest({
      method: 'GET',
      url: `${BASE}/v1/validate`,
      headers: { Authorization: AUTH },
      timeout_ms: 30_000,
      max_retries: 2,
      fetch_impl: fetchMock,
    });
    // Attach a catch handler BEFORE draining timers so the rejection isn't
    // flagged as unhandled while advanceAll() is draining.
    const caught = p.catch((e) => e);
    await advanceAll();
    const e = (await caught) as VatverifyError;
    expect(e).toBeInstanceOf(VatverifyError);
    expect(e.attempt_count).toBe(3);
  });
});
