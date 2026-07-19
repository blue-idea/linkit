import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, resetApp } from '../e2e/local-mvp/helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

const themes = [
  { id: 'daylight', label: 'Daylight' },
  { id: 'paper', label: 'Paper' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'graphite', label: 'Graphite' },
  { id: 'sunset', label: 'Sunset' },
] as const;

test.describe('TASK-046 六主题视觉回归', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await resetApp(page);
    await enterLocalMode(page);
    await mkdir(evidenceDirectory, { recursive: true });
  });

  // REQ-023-AC-003 / REQ-023-AC-007 / REQ-028-AC-004
  test('六套主题可选择、持久化并生成主窗口与设置截图', async ({ page }) => {
    for (const theme of themes) {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Settings' });
      await dialog.getByRole('tab', { name: 'Appearance' }).click();
      await expect(dialog.getByRole('button', { name: new RegExp(theme.label) })).toBeVisible();
      await dialog.getByRole('button', { name: new RegExp(theme.label) }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);

      await page.screenshot({
        path: resolve(evidenceDirectory, `TASK-046-${theme.id}-settings-actual.png`),
        fullPage: true,
      });
      await expect(page).toHaveScreenshot(`TASK-046-${theme.id}-settings-baseline.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.08,
      });

      await dialog.getByRole('button', { name: 'Save settings' }).click();
      await expect(dialog).toHaveCount(0);
      await page.screenshot({
        path: resolve(evidenceDirectory, `TASK-046-${theme.id}-main-actual.png`),
        fullPage: true,
      });
      await expect(page).toHaveScreenshot(`TASK-046-${theme.id}-main-baseline.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.08,
      });

      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id, { timeout: 10_000 });
    }
  });
});
