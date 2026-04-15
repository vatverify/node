import type { Vatverify, RequestOptions } from '../client.js';
import type { RatesListResponse, RatesSingleResponse } from '../types.js';

export async function list(
  client: Vatverify,
  request_options?: RequestOptions,
): Promise<RatesListResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: '/v1/rates',
    request_options,
  }) as Promise<RatesListResponse>;
}

export async function get(
  client: Vatverify,
  country: string,
  request_options?: RequestOptions,
): Promise<RatesSingleResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: `/v1/rates/${encodeURIComponent(country.toLowerCase())}`,
    request_options,
  }) as Promise<RatesSingleResponse>;
}
