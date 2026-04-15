import type { Vatverify, RequestOptions } from '../client.js';
import type {
  WebhookEndpointWithSecret,
  WebhookListResponse,
  WebhookTestResponse,
} from '../types.js';

export async function create(
  client: Vatverify,
  url: string,
  options?: RequestOptions,
): Promise<WebhookEndpointWithSecret> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'POST',
    path: '/v1/webhooks',
    body: { url },
    request_options: options,
  }) as Promise<WebhookEndpointWithSecret>;
}

export async function list(
  client: Vatverify,
  options?: RequestOptions,
): Promise<WebhookListResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'GET',
    path: '/v1/webhooks',
    request_options: options,
  }) as Promise<WebhookListResponse>;
}

export async function del(
  client: Vatverify,
  id: string,
  options?: RequestOptions,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)._request({
    method: 'DELETE',
    path: `/v1/webhooks/${id}`,
    request_options: options,
  });
}

export async function test(
  client: Vatverify,
  id: string,
  options?: RequestOptions,
): Promise<WebhookTestResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._request({
    method: 'POST',
    path: `/v1/webhooks/${id}/test`,
    request_options: options,
  }) as Promise<WebhookTestResponse>;
}
