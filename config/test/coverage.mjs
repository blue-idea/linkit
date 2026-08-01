/** @type {import('vitest/config').CoverageV8Options} */
export const coverageOptions = {
  provider: 'v8',
  reporter: ['text', 'html', 'json-summary'],
  reportsDirectory: 'coverage',
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.test.{ts,tsx}',
    'src/**/*.d.ts',
    'src/main.tsx',
    'src/vite-env.d.ts',
    'src/data.ts',
    'src/supabase.ts',
  ],
};
