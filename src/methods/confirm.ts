import type { Vatverify, RequestOptions } from '../client.js';
import type {
  ConfirmRequest,
  ConfirmResponse,
  ConfirmationDetailResponse,
  ConfirmRequestOptions,
} from '../types.js';

export async function confirm(
  client: Vatverify,
  input: ConfirmRequest,
  options?: ConfirmRequestOptions,
  request_options?: RequestOptions,
): Promise<ConfirmResponse> {
  const headers: Record<string, string> = {};
  if (options?.idempotency_key) {
    headers['Idempotency-Key'] = options.idempotency_key;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'POST',
    path: '/v1/confirm',
    body: input,
    headers,
    request_options,
  }) as Promise<ConfirmResponse>;
}

export async function getConfirmation(
  client: Vatverify,
  id: string,
  request_options?: RequestOptions,
): Promise<ConfirmationDetailResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: `/v1/confirmations/${encodeURIComponent(id)}`,
    request_options,
  }) as Promise<ConfirmationDetailResponse>;
}
