import type { Vatverify, RequestOptions } from '../client.js';
import type { AuditResponse } from '../types.js';

export async function get(
  client: Vatverify,
  requestId: string,
  options?: RequestOptions,
): Promise<AuditResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: `/v1/audits/${encodeURIComponent(requestId)}`,
    request_options: options,
  }) as Promise<AuditResponse>;
}
