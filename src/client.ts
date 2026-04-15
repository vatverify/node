import { doRequest, type ResponseHookInfo } from './request.js';
import { detectRuntime } from './runtime.js';
import { validate as validateFn, validateBatch as validateBatchFn } from './methods/validate.js';
import { decide as decideFn } from './methods/decide.js';
import * as RatesMethods from './methods/rates.js';
import { health as healthFn } from './methods/health.js';
import type {
  ValidateRequest, ValidateResponse,
  ValidateBatchRequest, ValidateBatchResponse,
  DecideRequest, DecideResponse,
  RatesListResponse, RatesSingleResponse,
  HealthResponse,
} from './types.js';

const SDK_VERSION = '0.1.0';
const DEFAULT_BASE_URL = 'https://api.vatverify.dev';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const TEST_KEY_PREFIX = 'vtv_test_';

export interface VatverifyConfig {
  api_key: string;
  base_url?: string;
  timeout?: number;
  max_retries?: number;
  fetch?: typeof fetch;
  user_agent_extra?: string;
  on_response?: (info: ResponseHookInfo) => void;
}

export interface RequestOptions {
  timeout?: number;
  max_retries?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

interface InternalRequestInput {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  request_options?: RequestOptions;
}

export class Vatverify {
  readonly base_url: string;
  readonly is_test_mode: boolean;

  private readonly api_key: string;
  private readonly timeout: number;
  private readonly max_retries: number;
  private readonly fetch_impl: typeof fetch;
  private readonly user_agent: string;
  private readonly on_response: ((info: ResponseHookInfo) => void) | undefined;

  constructor(configOrKey?: string | VatverifyConfig) {
    let config: VatverifyConfig;
    if (typeof configOrKey === 'string') {
      config = { api_key: configOrKey };
    } else if (configOrKey && typeof configOrKey === 'object') {
      config = configOrKey;
    } else {
      config = { api_key: '' };
    }

    const api_key = config.api_key || getEnvApiKey();
    if (!api_key) {
      throw new Error(
        'Vatverify: api_key is required. Pass it as the first argument, ' +
          'provide `{ api_key }` in config, or set VATVERIFY_API_KEY in the environment.',
      );
    }

    if (config.timeout !== undefined && config.timeout <= 0) {
      throw new Error('Vatverify: timeout must be > 0 (milliseconds).');
    }
    if (config.max_retries !== undefined && config.max_retries < 0) {
      throw new Error('Vatverify: max_retries must be >= 0.');
    }

    this.api_key = api_key;
    this.base_url = (config.base_url ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.max_retries = config.max_retries ?? DEFAULT_MAX_RETRIES;
    this.fetch_impl = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.on_response = config.on_response;
    this.is_test_mode = api_key.startsWith(TEST_KEY_PREFIX);
    this.user_agent = buildUserAgent(config.user_agent_extra);
  }

  validate(input: ValidateRequest, options?: { request_options?: RequestOptions }): Promise<ValidateResponse> {
    return validateFn(this, input, options?.request_options);
  }

  validateBatch(input: ValidateBatchRequest, options?: { request_options?: RequestOptions }): Promise<ValidateBatchResponse> {
    return validateBatchFn(this, input, options?.request_options);
  }

  /**
   * Determine the correct VAT treatment for a B2B transaction.
   * B2B only — pass `b2b: true` implied. The API returns a `b2c_not_supported` error for consumer buyers.
   * Requires a Business plan.
   */
  decide(input: DecideRequest, options?: { request_options?: RequestOptions }): Promise<DecideResponse> {
    return decideFn(this, input, options?.request_options);
  }

  health(options?: { request_options?: RequestOptions }): Promise<HealthResponse> {
    return healthFn(this, options?.request_options);
  }

  get rates() {
    const self = this;
    return {
      list(options?: { request_options?: RequestOptions }): Promise<RatesListResponse> {
        return RatesMethods.list(self, options?.request_options);
      },
      get(country: string, options?: { request_options?: RequestOptions }): Promise<RatesSingleResponse> {
        return RatesMethods.get(self, country, options?.request_options);
      },
    };
  }

  /** Internal. Methods call this. */
  async _request<T>(input: InternalRequestInput): Promise<T> {
    const url = this.buildUrl(input.path, input.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.api_key}`,
      'User-Agent': this.user_agent,
      Accept: 'application/json',
      ...(input.request_options?.headers ?? {}),
    };
    let body: string | undefined;
    if (input.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(input.body);
    }
    return doRequest<T>({
      method: input.method,
      url,
      headers,
      body,
      timeout_ms: input.request_options?.timeout ?? this.timeout,
      max_retries: input.request_options?.max_retries ?? this.max_retries,
      signal: input.request_options?.signal,
      fetch_impl: this.fetch_impl,
      on_response: this.on_response,
    });
  }

  private buildUrl(path: string, query?: Record<string, string | undefined>): string {
    const u = new URL(path, this.base_url + '/');
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) u.searchParams.set(k, v);
      }
    }
    return u.toString();
  }
}

function getEnvApiKey(): string {
  const g = globalThis as Record<string, unknown>;
  const proc = g.process as { env?: Record<string, string | undefined> } | undefined;
  return proc?.env?.VATVERIFY_API_KEY ?? '';
}

function buildUserAgent(extra: string | undefined): string {
  const base = `@vatverify/node/${SDK_VERSION} ${detectRuntime()}`;
  return extra ? `${base} ${extra}` : base;
}

export { SDK_VERSION };
