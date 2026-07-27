import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, expectLoginGate } from '../e2e/helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence',
);

test('TASK-077 Settings AI 连接成功状态视觉回归', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { go?: Record<string, unknown> }).go = {
      ai: {
        Service: {
          TestConnection: async () => ({
            status: 'ok',
            latencyMs: 42,
            testedAt: '2026-07-27T09:00:00.000Z',
          }),
        },
      },
    };
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expectLoginGate(page);
  await enterLocalMode(page);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'AI' }).click();
  await dialog.getByPlaceholder('https://api.openai.com/v1').fill('https://api.example.test/v1');
  await dialog.getByPlaceholder('gpt-4o-mini').fill('test-model');
  await dialog.getByLabel('API Key').fill('sk-visual-placeholder');
  await dialog.getByRole('button', { name: 'Test connection' }).click();
  await expect(dialog.getByText('Connected in 42 ms')).toBeVisible();

  await mkdir(evidenceDirectory, { recursive: true });
  await dialog.screenshot({
    path: resolve(evidenceDirectory, 'TASK-077-ai-connection-success-actual.png'),
    animations: 'disabled',
  });
  await expect(dialog).toHaveScreenshot('TASK-077-ai-connection-success-baseline.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.05,
  });
});
