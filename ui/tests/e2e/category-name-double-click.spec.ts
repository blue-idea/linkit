import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Continue in local mode' }).click();
  await expect(page.getByRole('banner', { name: 'Top bar' })).toBeVisible();
}

test.describe('TASK-072 分类名称双击展开与折叠', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterLocalMode(page);
  });

  // fix_task 1.14 / REQ-010-AC-006
  test('分类名称 shall 由双击切换子分类且保留单击选择与箭头入口', async ({ page }) => {
    const parentRow = page.locator('[data-category-drop="Engineering"]');
    const parentLabel = parentRow.locator('[data-nav-label="true"]');
    const childLabel = page.locator('[data-category-drop="Frontend"] [data-nav-label="true"]');

    await expect(childLabel).toBeVisible();
    await parentLabel.click();
    await expect(childLabel).toBeVisible();

    await parentLabel.dblclick();
    await expect(childLabel).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Expand Engineering' })).toHaveAttribute('aria-expanded', 'false');

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-072-category-name-double-click-actual.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await expect(page).toHaveScreenshot('TASK-072-category-name-double-click-baseline.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.08,
    });

    await parentLabel.dblclick();
    await expect(childLabel).toBeVisible();

    await page.getByRole('button', { name: 'Collapse Engineering' }).click();
    await expect(childLabel).toHaveCount(0);
    await page.getByRole('button', { name: 'Expand Engineering' }).click();
    await expect(childLabel).toBeVisible();
  });
});
