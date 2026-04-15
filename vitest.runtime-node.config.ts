import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/runtime/node.test.ts'],
    environment: 'node',
    globals: false,
  },
});
