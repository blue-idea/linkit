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

test.describe('分类 CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-010-AC-002
  test('分类创建 shall 在侧栏树中显示新分类', async ({ page }) => {
    await page.getByRole('button', { name: 'New category' }).click();
    await expect(page.getByRole('dialog', { name: 'New category' })).toBeVisible();
    await page.getByLabel('Category name').fill('TASK014 New Category');
    await page.getByRole('button', { name: 'Create category' }).click();
    await expect(page.getByText('TASK014 New Category', { exact: true })).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-014-category-create.png'),
      fullPage: true,
    });
  });

  // REQ-010-AC-003
  test('分类删除 shall 显示移动、递归与取消三种选择', async ({ page }) => {
    // 选中一个已知有内容的分类入口后打开删除
    await page.getByRole('button', { name: 'Delete category' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Delete this category?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move contents then delete' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete recursively' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel category delete' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel category delete' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete this category?' })).toHaveCount(0);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.getByRole('button', { name: 'Delete category' }).first().click();
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-014-category-delete.png'),
      fullPage: true,
    });
  });
});
