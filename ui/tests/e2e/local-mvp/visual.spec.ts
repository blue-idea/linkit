import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, resetApp } from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../docs/spec/evidence'
);

test.describe('local MVP visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
    await enterLocalMode(page);
  });

  // REQ-028-AC-004
  test('main window baseline actual and diff', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Sidebar' })).toBeVisible();
    await expect(page.getByRole('main', { name: 'Content Area' })).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-025-main-window-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-025-main-window-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.08,
    });
  });

  // REQ-028-AC-004
  test('settings and six views visual evidence', async ({ page }) => {
    for (const name of [
      'Card view',
      'List view',
      'Masonry view',
      'Timeline view',
      'Tag Aggregation view',
      'Theme Space view',
    ]) {
      await page.getByRole('button', { name }).click();
    }

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-025-six-views-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-025-six-views-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.08,
    });

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-025-settings-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-025-settings-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.08,
    });
  });
});
