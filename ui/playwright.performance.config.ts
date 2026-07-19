import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/performance',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: { baseURL, ...devices['Desktop Chrome'], trace: 'off', screenshot: 'off' },
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4173',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
