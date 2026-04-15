import type { Vatverify, RequestOptions } from '../client.js';
import type { HealthResponse } from '../types.js';

export async function health(
  client: Vatverify,
  request_options?: RequestOptions,
): Promise<HealthResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: '/health',
    request_options,
  }) as Promise<HealthResponse>;
}
