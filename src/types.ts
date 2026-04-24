import type { components } from './generated/types.js';

/** A VAT rate record returned by /v1/rates endpoints. */
export type CountryRate = components['schemas']['CountryRate'];

/** Request body for /v1/validate. */
export type ValidateRequest = {
  vat_number: string;
  cache?: boolean;
  requester_vat_number?: string;
};

/** Response envelope for /v1/validate. */
export type ValidateResponse = components['schemas']['ValidateResponse'];
/** `data` field of /v1/validate response. */
export type ValidateData = components['schemas']['ValidateData'];

/** Request body for /v1/validate/batch. */
export type ValidateBatchRequest = components['schemas']['ValidateBatchRequest'];
/** Response envelope for /v1/validate/batch. */
export type ValidateBatchResponse = components['schemas']['ValidateBatchResponse'];
/** Per-item result inside a batch response. */
export type BatchResultItem = components['schemas']['BatchResultItem'];
/** Summary counts inside a batch response. */
export type BatchSummary = components['schemas']['BatchSummary'];
/** Per-item error shape inside a batch response. */
export type BatchPerItemError = components['schemas']['BatchPerItemError'];

/** Request body for /v1/decide. */
export type DecideRequest = components['schemas']['DecideRequest'];

/** Response envelope for /v1/decide. */
export type DecideResponse = components['schemas']['DecideResponse'];
/** `data` field of /v1/decide response. */
export type DecideData = components['schemas']['DecideData'];

/** Response envelope for GET /v1/rates (list). */
export type RatesListResponse = components['schemas']['RatesListResponse'];
/** Response envelope for GET /v1/rates/{country}. */
export type RatesSingleResponse = components['schemas']['RatesSingleResponse'];

/** Standard meta block on every /v1/validate / /v1/decide response. */
export type Meta = components['schemas']['Meta'];
/** Meta block on /v1/rates responses (includes data_version). */
export type RatesMeta = components['schemas']['RatesMeta'];
/** Meta block on /v1/rates list response (adds count). */
export type RatesListMeta = components['schemas']['RatesListMeta'];

/** Error envelope returned on non-2xx responses. */
export type ErrorEnvelope = components['schemas']['ErrorEnvelope'];

/** Health response shape. */
export type HealthResponse = components['schemas']['HealthResponse'];

/** A webhook endpoint as returned by GET /v1/webhooks (no secret). */
export type WebhookEndpointPublic = {
  id: string;
  url: string;
  created_at: string;
};

/** Response from POST /v1/webhooks — includes secret (shown once). */
export type WebhookEndpointWithSecret = WebhookEndpointPublic & {
  secret: string;
};

/** Response from GET /v1/webhooks. */
export type WebhookListResponse = {
  data: WebhookEndpointPublic[];
};

/** Response from POST /v1/webhooks/{id}/test. */
export type WebhookTestResponse = {
  delivered: boolean;
  status: number;
};

/** A stored audit log record returned by GET /v1/audits/{request_id}. */
export type AuditRecord = {
  request_id: string;
  endpoint: 'validate' | 'decide' | 'validate_batch';
  response: unknown;
  created_at: string;
  expires_at: string;
};

/**
 * BZSt field-match code, returned for each of the four qualified fields
 * (name, street, postcode, town):
 * - `A` = matches
 * - `B` = does not match
 * - `C` = not requested (the caller did not supply this field)
 * - `D` = not provided by the foreign EU registry
 */
export type MatchCode = 'A' | 'B' | 'C' | 'D';

/** Request body for POST /v1/confirm. */
export type ConfirmRequest = {
  /** Foreign EU VAT number to confirm (with country prefix). */
  vat_number: string;
  /** Company details to verify against the foreign registry. */
  company: {
    name: string;
    street?: string;
    postcode?: string;
    town?: string;
  };
  /**
   * German VAT number authorising the confirmation. Overrides the per-key
   * default. Must pass DE MOD-11 checksum.
   */
  requester_vat_number?: string;
};

/** Response envelope for POST /v1/confirm. */
export type ConfirmResponse = {
  data: {
    /** True for evatr-0000 (fully qualified) and evatr-0003 (VAT valid, partial match). */
    valid: boolean;
    /** True only when every requested field returned A. */
    qualified: boolean;
    vat_number: string;
    requester_vat_number: string;
    matches: {
      name: MatchCode;
      street: MatchCode;
      postcode: MatchCode;
      town: MatchCode;
    };
    company: {
      name: string | null;
      street: string | null;
      postcode: string | null;
      town: string | null;
    };
    valid_from: string | null;
    valid_to: string | null;
    /** Retrievable later via `vat.confirmations.get(id)`. */
    confirmation_id: string;
    confirmed_at: string;
  };
  meta: {
    source: 'bzst';
    source_status: 'live';
    latency_ms: number;
    request_id: string;
    bzst_status_code: string;
  };
};

/** A stored §18e confirmation record returned by GET /v1/confirmations/{id}. */
export type ConfirmationRecord = {
  id: string;
  request_id: string;
  requester_vat: string;
  queried_vat: string;
  bzst_status_code: string;
  valid: boolean;
  qualified: boolean;
  matches: {
    name: MatchCode | null;
    street: MatchCode | null;
    postcode: MatchCode | null;
    town: MatchCode | null;
  };
  result: {
    name: string | null;
    street: string | null;
    postcode: string | null;
    town: string | null;
  };
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
};

/** Response envelope for GET /v1/confirmations/{id}. */
export type ConfirmationDetailResponse = {
  data: ConfirmationRecord;
  meta: { request_id: string };
};

/** Options specific to `vat.confirm()`. */
export type ConfirmRequestOptions = {
  /**
   * Client-supplied UUID. Retried POSTs with the same key within 24 hours
   * return the originally stored confirmation instead of issuing a new one
   * to BZSt. Safe for retry on network flakes.
   */
  idempotency_key?: string;
};

/** Response envelope for GET /v1/audits/{request_id}. */
export type AuditResponse = {
  data: AuditRecord;
  meta: {
    request_id: string;
    latency_ms: number;
  };
};
