import type { Vatverify } from '../client.js';
import type { HealthResponse } from '../types.js';

export async function health(client: Vatverify): Promise<HealthResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: '/health',
  }) as Promise<HealthResponse>;
}
