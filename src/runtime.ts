/**
 * Detect the current JavaScript runtime.
 * Returns a string of the form `<runtime>/<version>` suitable for the
 * User-Agent header. Falls back to `unknown/unknown` when no known
 * runtime is detected.
 *
 * Detection order matters: checked in order of specificity.
 * - Bun sets `globalThis.Bun.version`
 * - Deno sets `globalThis.Deno.version.deno`
 * - Vercel Edge sets `globalThis.EdgeRuntime`
 * - Cloudflare Workers expose `globalThis.WebSocketPair` (unique to Workers)
 * - Node sets `globalThis.process.versions.node`
 */
export function detectRuntime(): string {
  const g = globalThis as Record<string, unknown>;

  const bun = g.Bun as { version?: string } | undefined;
  if (bun?.version) return `bun/${bun.version}`;

  const deno = g.Deno as { version?: { deno?: string } } | undefined;
  if (deno?.version?.deno) return `deno/${deno.version.deno}`;

  if (g.EdgeRuntime) return 'edge-runtime/unknown';

  if (typeof g.WebSocketPair === 'function') return 'cloudflare-workers/unknown';

  const proc = g.process as { versions?: { node?: string } } | undefined;
  if (proc?.versions?.node) return `node/${proc.versions.node}`;

  return 'unknown/unknown';
}
