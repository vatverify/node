import { expectType, expectAssignable } from 'tsd';
import {
  Vatverify,
  VatverifyError,
  RateLimitError,
  type ValidateResponse,
  type ValidateBatchResponse,
  type DecideResponse,
  type RatesListResponse,
  type RatesSingleResponse,
  type BatchResultItem,
} from '../../src/index.js';

// Construction
const client = new Vatverify('vtv_live_x');
expectType<boolean>(client.is_test_mode);
expectType<string>(client.base_url);

// validate returns ValidateResponse
expectType<Promise<ValidateResponse>>(client.validate({ vat_number: 'IE6388047V' }));

// validateBatch returns ValidateBatchResponse
expectType<Promise<ValidateBatchResponse>>(
  client.validateBatch({ vat_numbers: ['IE6388047V'] }),
);

// decide returns DecideResponse
expectType<Promise<DecideResponse>>(
  client.decide({ seller_vat: 'DE1', buyer_vat: 'FR1' }),
);

// rates.list returns RatesListResponse
expectType<Promise<RatesListResponse>>(client.rates.list());

// rates.get returns RatesSingleResponse
expectType<Promise<RatesSingleResponse>>(client.rates.get('de'));

// BatchResultItem is a discriminated union
declare const item: BatchResultItem;
if (item.ok) {
  expectType<true>(item.ok);
  expectAssignable<unknown>(item.data);
} else {
  expectType<false>(item.ok);
  expectAssignable<{ code: string; message: string }>(item.error);
}

// Error classes are throwable
declare const e: unknown;
if (e instanceof RateLimitError) {
  expectType<number>(e.retry_after);
  expectType<{ limit: number; remaining: number; reset: number }>(e.rate_limit);
}
if (e instanceof VatverifyError) {
  expectType<string | null>(e.request_id);
  expectType<number>(e.attempt_count);
}
