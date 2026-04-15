import { describe, it, expect, afterEach } from 'vitest';
import { detectRuntime } from '../src/runtime.js';

const originalGlobals: Record<string, unknown> = {};
const keysToRestore = ['Bun', 'Deno', 'EdgeRuntime', 'WebSocketPair'] as const;

function stash() {
  for (const k of keysToRestore) {
    originalGlobals[k] = (globalThis as Record<string, unknown>)[k];
  }
}

function restore() {
  for (const k of keysToRestore) {
    if (originalGlobals[k] === undefined) {
      delete (globalThis as Record<string, unknown>)[k];
    } else {
      (globalThis as Record<string, unknown>)[k] = originalGlobals[k];
    }
  }
}

describe('detectRuntime', () => {
  afterEach(restore);

  it('detects Node by default (under vitest)', () => {
    stash();
    delete (globalThis as Record<string, unknown>).Bun;
    delete (globalThis as Record<string, unknown>).Deno;
    delete (globalThis as Record<string, unknown>).EdgeRuntime;
    delete (globalThis as Record<string, unknown>).WebSocketPair;
    const tag = detectRuntime();
    expect(tag).toMatch(/^node\/\d+\.\d+\.\d+/);
  });

  it('detects Bun when Bun.version is set', () => {
    stash();
    (globalThis as Record<string, unknown>).Bun = { version: '1.1.13' };
    expect(detectRuntime()).toBe('bun/1.1.13');
  });

  it('detects Deno when Deno.version.deno is set', () => {
    stash();
    (globalThis as Record<string, unknown>).Deno = { version: { deno: '1.45.0' } };
    expect(detectRuntime()).toBe('deno/1.45.0');
  });

  it('detects Vercel Edge when EdgeRuntime is set', () => {
    stash();
    (globalThis as Record<string, unknown>).EdgeRuntime = 'vercel';
    expect(detectRuntime()).toBe('edge-runtime/unknown');
  });

  it('detects Cloudflare Workers when WebSocketPair is set and not Bun/Deno/Edge', () => {
    stash();
    (globalThis as Record<string, unknown>).WebSocketPair = function () {};
    expect(detectRuntime()).toBe('cloudflare-workers/unknown');
  });

  it('returns unknown/unknown when nothing matches', () => {
    stash();
    delete (globalThis as Record<string, unknown>).Bun;
    delete (globalThis as Record<string, unknown>).Deno;
    delete (globalThis as Record<string, unknown>).EdgeRuntime;
    delete (globalThis as Record<string, unknown>).WebSocketPair;
    const origProcess = (globalThis as Record<string, unknown>).process;
    (globalThis as Record<string, unknown>).process = {};
    expect(detectRuntime()).toBe('unknown/unknown');
    (globalThis as Record<string, unknown>).process = origProcess;
  });

  it('prefers Bun over Node when both are present', () => {
    stash();
    (globalThis as Record<string, unknown>).Bun = { version: '1.1.13' };
    expect(detectRuntime()).toBe('bun/1.1.13');
  });
});
