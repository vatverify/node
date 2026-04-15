import { errorFromResponse, NetworkError, TimeoutError } from './errors.js';

export interface DoRequestInput {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeout_ms: number;
  max_retries: number;
  signal?: AbortSignal;
  fetch_impl: typeof fetch;
  on_response?: (info: ResponseHookInfo) => void;
}

export interface ResponseHookInfo {
  method: string;
  url: string;
  status_code: number;
  request_id: string | null;
  latency_ms: number;
  attempt_count: number;
}

const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const BACKOFF_BASE_MS = 100;
const BACKOFF_CAP_MS = 2000;
const RETRY_AFTER_CAP_MS = 30_000;

function shouldRetry(err: unknown, statusCode?: number): boolean {
  if (statusCode !== undefined && statusCode > 0) return RETRY_STATUSES.has(statusCode);
  const anyErr = err as { code?: string } | null;
  if (!anyErr) return false;
  if (anyErr.code === 'network_error' || anyErr.code === 'timeout') return true;
  return false;
}

function backoffMs(attempt: number, jitter: () => number = Math.random): number {
  const exp = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * Math.pow(2, attempt));
  return exp + Math.floor(jitter() * 100);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Low-level request pipeline. Combines AbortController-based timeout,
 * external-signal propagation, error mapping, and a retry loop with
 * exponential backoff + jitter. Retries on network/timeout errors and
 * on 429/502/503/504 responses. Honors Retry-After on 429 (capped at 30s).
 */
export async function doRequest<T = unknown>(input: DoRequestInput): Promise<T> {
  const maxAttempts = input.max_retries + 1;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptOnce<T>(input, attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) throw err;

      const status = (err as { status_code?: number }).status_code;
      if (!shouldRetry(err, status)) throw err;

      let delay = backoffMs(attempt);
      if (status === 429) {
        const retry_after_s = (err as { retry_after?: number }).retry_after ?? 0;
        if (retry_after_s > 0) {
          delay = Math.min(retry_after_s * 1000, RETRY_AFTER_CAP_MS);
        }
      }
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function attemptOnce<T>(input: DoRequestInput, attempt_count: number): Promise<T> {
  const start = Date.now();
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), input.timeout_ms);

  if (input.signal) {
    if (input.signal.aborted) {
      timeoutController.abort();
    } else {
      input.signal.addEventListener('abort', () => timeoutController.abort());
    }
  }

  let res: Response;
  try {
    res = await input.fetch_impl(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body,
      signal: timeoutController.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TimeoutError(`Request timed out after ${input.timeout_ms}ms`, {
        code: 'timeout',
        status_code: 0,
        request_id: null,
        response_body: null,
        attempt_count,
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new NetworkError(`Network error: ${message}`, {
      code: 'network_error',
      status_code: 0,
      request_id: null,
      response_body: null,
      attempt_count,
    });
  }
  clearTimeout(timer);

  const latency_ms = Date.now() - start;
  const request_id = res.headers.get('x-request-id');

  if (input.on_response) {
    input.on_response({
      method: input.method,
      url: input.url,
      status_code: res.status,
      request_id,
      latency_ms,
      attempt_count,
    });
  }

  if (!res.ok) {
    throw await errorFromResponse(res, attempt_count);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}
