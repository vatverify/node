import type { Vatverify, RequestOptions } from '../client.js';
import type {
  ValidateRequest,
  ValidateResponse,
  ValidateBatchRequest,
  ValidateBatchResponse,
} from '../types.js';

export async function validate(
  client: Vatverify,
  input: ValidateRequest,
  request_options?: RequestOptions,
): Promise<ValidateResponse> {
  const query: Record<string, string | undefined> = {
    vat_number: input.vat_number,
    cache: input.cache === undefined ? undefined : String(input.cache),
    requester_vat_number: input.requester_vat_number,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: '/v1/validate',
    query,
    request_options,
  }) as Promise<ValidateResponse>;
}

export async function validateBatch(
  client: Vatverify,
  input: ValidateBatchRequest,
  request_options?: RequestOptions,
): Promise<ValidateBatchResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'POST',
    path: '/v1/validate/batch',
    body: input,
    request_options,
  }) as Promise<ValidateBatchResponse>;
}
