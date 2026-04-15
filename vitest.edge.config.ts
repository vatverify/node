import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/runtime/edge.test.ts'],
    environment: 'edge-runtime',
    globals: false,
  },
});
