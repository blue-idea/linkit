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
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

test.describe('分类图标设置', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // fix_task 1.2：悬停操作打开候选图标与颜色并更新分类。
  test('分类图标设置 shall 提供更多候选图标与颜色并更新侧栏', async ({ page }) => {
    const leafRow = page.locator('[data-category-drop="配色"]').first();
    await expect(leafRow).toBeVisible();
    await leafRow.hover();
    await leafRow.getByRole('button', { name: 'Set category icon' }).click();

    await expect(page.getByRole('heading', { name: 'Set category icon' })).toBeVisible();
    const listbox = page.getByRole('listbox', { name: 'Category icon candidates' });
    await expect(listbox).toBeVisible();
    expect(await listbox.getByRole('option').count()).toBeGreaterThan(40);
    await expect(page.getByRole('group', { name: 'Category icon color' })).toBeVisible();

    await page.getByRole('option', { name: 'Icon Rocket' }).click();
    await page.getByRole('button', { name: 'Color coral' }).click();
    await page.getByRole('button', { name: 'Save category icon' }).click();
    await expect(page.getByText('Category icon updated')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Set category icon' })).toHaveCount(0);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'fix-1.2-category-icon.png'),
      fullPage: true,
    });
  });
});
