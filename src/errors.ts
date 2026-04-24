export type ErrorCode =
  | 'unauthorized'
  | 'plan_required'
  | 'invalid_format'
  | 'invalid_requester_vat'
  | 'country_unsupported'
  | 'country_unknown'
  | 'batch_too_large'
  | 'webhook_limit_reached'
  | 'seller_country_unsupported'
  | 'b2c_not_supported'
  | 'buyer_vat_not_registered'
  | 'not_found'
  | 'rate_limited'
  | 'registry_unavailable'
  | 'bzst_session_limit'
  | 'bzst_unavailable'
  | 'bzst_rejected'
  | 'network_error'
  | 'timeout'
  | 'unknown_error';

export interface VatverifyErrorInit {
  code: ErrorCode;
  status_code: number;
  request_id: string | null;
  response_body: unknown;
  attempt_count: number;
}

export class VatverifyError extends Error {
  readonly code: ErrorCode;
  readonly status_code: number;
  readonly request_id: string | null;
  readonly response_body: unknown;
  readonly attempt_count: number;

  constructor(message: string, init: VatverifyErrorInit) {
    super(message);
    this.name = 'VatverifyError';
    this.code = init.code;
    this.status_code = init.status_code;
    this.request_id = init.request_id;
    this.response_body = init.response_body;
    this.attempt_count = init.attempt_count;
  }
}

export class AuthError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'AuthError';
  }
}

export class ValidationError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'NotFoundError';
  }
}

export class PlanError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'PlanError';
  }
}

export class WebhookLimitError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'WebhookLimitError';
  }
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimitErrorInit extends VatverifyErrorInit {
  retry_after: number;
  rate_limit: RateLimitInfo;
}

export class RateLimitError extends VatverifyError {
  readonly retry_after: number;
  readonly rate_limit: RateLimitInfo;

  constructor(message: string, init: RateLimitErrorInit) {
    super(message, init);
    this.name = 'RateLimitError';
    this.retry_after = init.retry_after;
    this.rate_limit = init.rate_limit;
  }
}

export class RegistryError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'RegistryError';
  }
}

export class NetworkError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'TimeoutError';
  }
}

/**
 * Raised when BZSt enforces a session-level rate limit (evatr-0008).
 * The session-scoping semantics are not documented; treat as a transient
 * 429 and retry with backoff.
 */
export class BzstSessionLimitError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'BzstSessionLimitError';
  }
}

/**
 * Raised when the BZSt service is unavailable (evatr-0011) or the foreign
 * EU member state can't be reached (evatr-0013).
 */
export class BzstUnavailableError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'BzstUnavailableError';
  }
}

/**
 * Raised for any other BZSt rejection that doesn't fit a more specific
 * class (unknown evatr-XXXX, format issues surfaced by BZSt rather than
 * our preflight checksum).
 */
export class BzstRejectedError extends VatverifyError {
  constructor(message: string, init: VatverifyErrorInit) {
    super(message, init);
    this.name = 'BzstRejectedError';
  }
}

/** Map HTTP status code to the matching error class. */
export function errorClassForStatus(status: number): typeof VatverifyError {
  if (status === 400) return ValidationError;
  if (status === 401) return AuthError;
  if (status === 402) return PlanError;
  if (status === 404) return NotFoundError;
  if (status === 429) return RateLimitError;
  if (status === 502 || status === 503 || status === 504) return RegistryError;
  return VatverifyError;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
  meta?: { request_id?: string };
}

/**
 * Build a typed error from a non-2xx Response. Parses the body as JSON when
 * possible, falls back to raw text. Extracts `request_id` from meta and
 * rate-limit headers for RateLimitError.
 */
export async function errorFromResponse(res: Response, attempt_count: number): Promise<VatverifyError> {
  const contentType = res.headers.get('content-type') ?? '';
  let body: unknown;
  let parsed: ErrorEnvelope | null = null;
  if (contentType.includes('application/json')) {
    try {
      body = await res.json();
      parsed = body as ErrorEnvelope;
    } catch {
      body = null;
    }
  } else {
    try {
      body = await res.text();
    } catch {
      body = null;
    }
  }

  const code = (parsed?.error?.code ?? 'unknown_error') as ErrorCode;
  const message = parsed?.error?.message ?? `HTTP ${res.status}`;
  const request_id = parsed?.meta?.request_id ?? null;

  const Cls = errorClassForStatus(res.status);

  const baseInit: VatverifyErrorInit = {
    code,
    status_code: res.status,
    request_id,
    response_body: body,
    attempt_count,
  };

  if (code === 'webhook_limit_reached') {
    return new WebhookLimitError(message, baseInit);
  }

  if (code === 'bzst_session_limit') {
    return new BzstSessionLimitError(message, baseInit);
  }
  if (code === 'bzst_unavailable') {
    return new BzstUnavailableError(message, baseInit);
  }
  if (code === 'bzst_rejected') {
    return new BzstRejectedError(message, baseInit);
  }

  if (Cls === RateLimitError) {
    const retryAfterHeader = res.headers.get('retry-after');
    const retry_after = retryAfterHeader ? Number(retryAfterHeader) : 0;
    const rate_limit: RateLimitInfo = {
      limit: Number(res.headers.get('x-ratelimit-limit') ?? 0),
      remaining: Number(res.headers.get('x-ratelimit-remaining') ?? 0),
      reset: Number(res.headers.get('x-ratelimit-reset') ?? 0),
    };
    return new RateLimitError(message, { ...baseInit, retry_after, rate_limit });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (Cls as any)(message, baseInit);
}
