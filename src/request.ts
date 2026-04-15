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

/**
 * Low-level request pipeline. Combines AbortController-based timeout,
 * external-signal propagation, and error mapping. In this baseline version
 * there is no retry loop — that is added in the follow-up task.
 */
export async function doRequest<T = unknown>(input: DoRequestInput): Promise<T> {
  return attemptOnce<T>(input, 1);
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
