import { describe, it, expect } from 'vitest';
import {
  VatverifyError,
  AuthError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  RegistryError,
  PlanError,
  NetworkError,
  TimeoutError,
  errorClassForStatus,
  errorFromResponse,
} from '../src/errors.js';

describe('VatverifyError hierarchy', () => {
  it('VatverifyError is a subclass of Error', () => {
    const e = new VatverifyError('x', {
      code: 'invalid_format',
      status_code: 400,
      request_id: 'req_1',
      response_body: null,
      attempt_count: 1,
    });
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(VatverifyError);
    expect(e.name).toBe('VatverifyError');
  });

  it('AuthError extends VatverifyError', () => {
    const e = new AuthError('bad key', {
      code: 'unauthorized',
      status_code: 401,
      request_id: null,
      response_body: null,
      attempt_count: 1,
    });
    expect(e).toBeInstanceOf(VatverifyError);
    expect(e).toBeInstanceOf(AuthError);
    expect(e.name).toBe('AuthError');
  });

  it('RateLimitError carries retry_after and rate_limit', () => {
    const e = new RateLimitError('too many', {
      code: 'rate_limited',
      status_code: 429,
      request_id: 'req_x',
      response_body: null,
      attempt_count: 3,
      retry_after: 60,
      rate_limit: { limit: 10_000, remaining: 0, reset: 1760000000 },
    });
    expect(e.retry_after).toBe(60);
    expect(e.rate_limit).toEqual({ limit: 10_000, remaining: 0, reset: 1760000000 });
  });

  it('preserves .code, .status_code, .request_id, .response_body, .attempt_count', () => {
    const body = { error: { code: 'country_unknown', message: 'XY' }, meta: { request_id: 'req_y' } };
    const e = new NotFoundError('XY', {
      code: 'country_unknown',
      status_code: 404,
      request_id: 'req_y',
      response_body: body,
      attempt_count: 1,
    });
    expect(e.code).toBe('country_unknown');
    expect(e.status_code).toBe(404);
    expect(e.request_id).toBe('req_y');
    expect(e.response_body).toEqual(body);
    expect(e.attempt_count).toBe(1);
  });

  it('subclasses include TimeoutError, NetworkError, RegistryError, PlanError, ValidationError', () => {
    expect(new ValidationError('x', { code: 'invalid_format', status_code: 400, request_id: null, response_body: null, attempt_count: 1 })).toBeInstanceOf(VatverifyError);
    expect(new RegistryError('x', { code: 'registry_unavailable', status_code: 502, request_id: null, response_body: null, attempt_count: 1 })).toBeInstanceOf(VatverifyError);
    expect(new PlanError('x', { code: 'plan_required', status_code: 402, request_id: null, response_body: null, attempt_count: 1 })).toBeInstanceOf(VatverifyError);
    expect(new NetworkError('x', { code: 'network_error', status_code: 0, request_id: null, response_body: null, attempt_count: 1 })).toBeInstanceOf(VatverifyError);
    expect(new TimeoutError('x', { code: 'timeout', status_code: 0, request_id: null, response_body: null, attempt_count: 1 })).toBeInstanceOf(VatverifyError);
  });
});

describe('errorClassForStatus', () => {
  it.each([
    [400, ValidationError],
    [401, AuthError],
    [402, PlanError],
    [404, NotFoundError],
    [429, RateLimitError],
    [502, RegistryError],
    [503, RegistryError],
    [504, RegistryError],
    [500, VatverifyError],
    [418, VatverifyError],
  ])('maps status %i to the correct class', (status, cls) => {
    expect(errorClassForStatus(status)).toBe(cls);
  });
});

describe('errorFromResponse', () => {
  it('builds a ValidationError from a 400 envelope', async () => {
    const body = {
      error: { code: 'invalid_format', message: 'vat_number missing' },
      meta: { request_id: 'req_abc', latency_ms: 12 },
    };
    const res = new Response(JSON.stringify(body), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
    const err = await errorFromResponse(res, 1);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.code).toBe('invalid_format');
    expect(err.request_id).toBe('req_abc');
    expect(err.attempt_count).toBe(1);
  });

  it('builds a RateLimitError with retry_after + rate_limit from 429 headers', async () => {
    const body = {
      error: { code: 'rate_limited', message: 'too many' },
      meta: { request_id: 'req_def', latency_ms: 4 },
    };
    const res = new Response(JSON.stringify(body), {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': '60',
        'x-ratelimit-limit': '10000',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1760000000',
      },
    });
    const err = (await errorFromResponse(res, 2)) as RateLimitError;
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retry_after).toBe(60);
    expect(err.rate_limit).toEqual({ limit: 10_000, remaining: 0, reset: 1760000000 });
  });

  it('handles non-JSON response body gracefully', async () => {
    const res = new Response('internal server error', {
      status: 500,
      headers: { 'content-type': 'text/plain' },
    });
    const err = await errorFromResponse(res, 1);
    expect(err).toBeInstanceOf(VatverifyError);
    expect(err.status_code).toBe(500);
    expect(err.response_body).toBe('internal server error');
  });
});
