import type { Vatverify } from '../client.js';
import type {
  ValidateRequest,
  ValidateResponse,
  ValidateBatchRequest,
  ValidateBatchResponse,
} from '../types.js';

export async function validate(
  client: Vatverify,
  input: ValidateRequest,
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
  }) as Promise<ValidateResponse>;
}

export async function validateBatch(
  client: Vatverify,
  input: ValidateBatchRequest,
): Promise<ValidateBatchResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'POST',
    path: '/v1/validate/batch',
    body: input,
  }) as Promise<ValidateBatchResponse>;
}
