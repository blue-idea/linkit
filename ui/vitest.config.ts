import { defineConfig, mergeConfig } from 'vitest/config';
import { coverageOptions } from '../config/test/coverage.mjs';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx,js}'],
      coverage: coverageOptions,
    },
  })
);
