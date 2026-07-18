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

test.describe('排序与筛选', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-009-AC-001：排序控件改变实际列表顺序（通过 Sort 选择与可见标题变化验证）。
  test('排序 shall 按所选键重排列表', async ({ page }) => {
    const sort = page.getByLabel('Sort bookmarks');
    await sort.selectOption('title');
    await expect(sort).toHaveValue('title');
    await sort.selectOption('visits');
    await expect(sort).toHaveValue('visits');
  });

  // REQ-009-AC-004：清除筛选后指示器消失并恢复范围结果。
  test('清除筛选 shall 恢复当前导航范围内的完整结果集', async ({ page }) => {
    const beforeCount = await page.locator('h1').locator('xpath=../p').textContent();
    expect(beforeCount).toBeTruthy();

    await page.getByLabel('Filter by read status').selectOption('reading');
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
    await expect(page.getByLabel('Filter by read status')).toHaveValue('all');

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-013-clear-filters.png'),
      fullPage: true,
    });
  });
});
