import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Vatverify } from '../src/client.js';

describe('Vatverify construction', () => {
  let origEnv: string | undefined;
  beforeEach(() => {
    origEnv = process.env.VATVERIFY_API_KEY;
    delete process.env.VATVERIFY_API_KEY;
  });
  afterEach(() => {
    if (origEnv !== undefined) process.env.VATVERIFY_API_KEY = origEnv;
    else delete process.env.VATVERIFY_API_KEY;
  });

  it('accepts a string api key', () => {
    const c = new Vatverify('vtv_live_abc');
    expect(c.is_test_mode).toBe(false);
  });

  it('accepts a config object', () => {
    const c = new Vatverify({ api_key: 'vtv_live_abc', timeout: 5000, max_retries: 0 });
    expect(c.is_test_mode).toBe(false);
  });

  it('detects test-mode keys by prefix', () => {
    const c = new Vatverify('vtv_test_abc');
    expect(c.is_test_mode).toBe(true);
  });

  it('reads VATVERIFY_API_KEY from env when no arg passed', () => {
    process.env.VATVERIFY_API_KEY = 'vtv_live_fromenv';
    const c = new Vatverify();
    expect(c.is_test_mode).toBe(false);
  });

  it('throws when no api_key is available', () => {
    expect(() => new Vatverify()).toThrow(/api_key/i);
  });

  it('throws on empty string api_key', () => {
    expect(() => new Vatverify('')).toThrow(/api_key/i);
  });

  it('throws when timeout is not a positive number', () => {
    expect(() => new Vatverify({ api_key: 'vtv_live_x', timeout: -1 })).toThrow(/timeout/i);
    expect(() => new Vatverify({ api_key: 'vtv_live_x', timeout: 0 })).toThrow(/timeout/i);
  });

  it('throws when max_retries is negative', () => {
    expect(() => new Vatverify({ api_key: 'vtv_live_x', max_retries: -1 })).toThrow(/max_retries/i);
  });

  it('normalizes base_url (strips trailing slash)', () => {
    const c = new Vatverify({ api_key: 'vtv_live_x', base_url: 'https://api.example.com/' });
    expect(c.base_url).toBe('https://api.example.com');
  });

  it('uses the default base_url when not specified', () => {
    const c = new Vatverify('vtv_live_x');
    expect(c.base_url).toBe('https://api.vatverify.dev');
  });
});

describe('Vatverify internal request pipeline', () => {
  it('_request builds URL with query + sends Auth + UA, returns parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { valid: true }, meta: { request_id: 'req_1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new Vatverify({
      api_key: 'vtv_live_abc',
      fetch: fetchMock,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await (client as any)._request({ method: 'GET', path: '/v1/validate', query: { vat_number: 'IE6388047V' } });
    expect(out).toEqual({ data: { valid: true }, meta: { request_id: 'req_1' } });

    const call = fetchMock.mock.calls[0]!;
    const urlArg = call[0] as string;
    const initArg = call[1] as RequestInit;
    expect(urlArg).toBe('https://api.vatverify.dev/v1/validate?vat_number=IE6388047V');
    const headers = new Headers(initArg.headers);
    expect(headers.get('authorization')).toBe('Bearer vtv_live_abc');
    expect(headers.get('user-agent')).toMatch(/^@vatverify\/node\/0\.1\.0/);
  });

  it('_request includes user_agent_extra when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const client = new Vatverify({
      api_key: 'vtv_live_abc',
      fetch: fetchMock,
      user_agent_extra: 'my-app/1.2.3',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any)._request({ method: 'GET', path: '/health' });
    const initArg = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = new Headers(initArg.headers);
    expect(headers.get('user-agent')).toMatch(/ my-app\/1\.2\.3$/);
  });

  it('_request POSTs with JSON body when body is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const client = new Vatverify({
      api_key: 'vtv_live_abc',
      fetch: fetchMock,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any)._request({
      method: 'POST',
      path: '/v1/decide',
      body: { seller_vat: 'DE1', buyer_vat: 'FR1' },
    });
    const call = fetchMock.mock.calls[0]!;
    const initArg = call[1] as RequestInit;
    expect(initArg.method).toBe('POST');
    const headers = new Headers(initArg.headers);
    expect(headers.get('content-type')).toBe('application/json');
    expect(initArg.body).toBe(JSON.stringify({ seller_vat: 'DE1', buyer_vat: 'FR1' }));
  });

  it('_request omits undefined query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const client = new Vatverify({ api_key: 'vtv_live_x', fetch: fetchMock });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any)._request({
      method: 'GET',
      path: '/v1/validate',
      query: { vat_number: 'IE1', cache: undefined, requester_vat_number: 'DE1' },
    });
    const urlArg = fetchMock.mock.calls[0]![0] as string;
    expect(urlArg).toContain('vat_number=IE1');
    expect(urlArg).toContain('requester_vat_number=DE1');
    expect(urlArg).not.toContain('cache=');
  });
});
