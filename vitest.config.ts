import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '#source': new URL('./src', import.meta.url).pathname } },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
