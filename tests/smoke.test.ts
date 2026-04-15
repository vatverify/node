import { describe, it, expect } from 'vitest';
import { SDK_VERSION } from '../src/index.js';

describe('smoke', () => {
  it('exports SDK_VERSION', () => {
    expect(SDK_VERSION).toBe('0.1.0');
  });
});
