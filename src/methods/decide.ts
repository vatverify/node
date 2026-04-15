import type { Vatverify } from '../client.js';
import type { DecideRequest, DecideResponse } from '../types.js';

export async function decide(
  client: Vatverify,
  input: DecideRequest,
): Promise<DecideResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'POST',
    path: '/v1/decide',
    body: input,
  }) as Promise<DecideResponse>;
}
