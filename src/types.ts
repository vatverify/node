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
