export { Vatverify, SDK_VERSION } from './client.js';
export type { VatverifyConfig, RequestOptions } from './client.js';

// Public types (from OpenAPI + input types)
export type {
  CountryRate,
  ValidateRequest,
  ValidateResponse,
  ValidateData,
  ValidateBatchRequest,
  ValidateBatchResponse,
  BatchResultItem,
  BatchSummary,
  BatchPerItemError,
  DecideRequest,
  DecideResponse,
  DecideData,
  RatesListResponse,
  RatesSingleResponse,
  Meta,
  RatesMeta,
  RatesListMeta,
  ErrorEnvelope,
  HealthResponse,
  WebhookEndpointPublic,
  WebhookEndpointWithSecret,
  WebhookListResponse,
  WebhookTestResponse,
  AuditRecord,
  AuditResponse,
  MatchCode,
  ConfirmRequest,
  ConfirmResponse,
  ConfirmRequestOptions,
  ConfirmationRecord,
  ConfirmationDetailResponse,
} from './types.js';

// Error classes (also importable from '@vatverify/node/errors')
export {
  VatverifyError,
  AuthError,
  ValidationError,
  NotFoundError,
  PlanError,
  RateLimitError,
  RegistryError,
  NetworkError,
  TimeoutError,
  WebhookLimitError,
  BzstSessionLimitError,
  BzstUnavailableError,
  BzstRejectedError,
} from './errors.js';
export type { ErrorCode, RateLimitInfo } from './errors.js';
