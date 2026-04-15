import type { Vatverify } from '../client.js';
import type { RatesListResponse, RatesSingleResponse } from '../types.js';

export async function list(client: Vatverify): Promise<RatesListResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: '/v1/rates',
  }) as Promise<RatesListResponse>;
}

export async function get(client: Vatverify, country: string): Promise<RatesSingleResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: `/v1/rates/${encodeURIComponent(country.toLowerCase())}`,
  }) as Promise<RatesSingleResponse>;
}
