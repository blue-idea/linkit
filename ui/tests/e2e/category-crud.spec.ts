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

  // REQ-010-AC-002 · fix_task 1.7
  test('分类改名 shall 在侧栏树中显示新名称', async ({ page }) => {
    await page.getByRole('button', { name: 'New category' }).click();
    await page.getByLabel('Category name').fill('FIX17 Rename Source');
    await page.getByRole('button', { name: 'Create category' }).click();
    await expect(page.getByText('FIX17 Rename Source', { exact: true })).toBeVisible();

    const label = page.getByText('FIX17 Rename Source', { exact: true }).first();
    const row = label.locator('xpath=ancestor::div[contains(@class,"group")][1]');
    await row.hover();
    await row.getByRole('button', { name: 'Rename category' }).click();
    const renameDialog = page.getByRole('dialog', { name: 'Rename category' });
    await expect(renameDialog).toBeVisible();
    await renameDialog.getByRole('textbox', { name: 'Category name' }).fill('FIX17 Renamed Category');
    await renameDialog.getByRole('button', { name: 'Save category name' }).click();
    await expect(page.getByText('FIX17 Renamed Category', { exact: true })).toBeVisible();
    await expect(page.getByText('FIX17 Rename Source', { exact: true })).toHaveCount(0);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'FIX-1.7-category-rename.png'),
      fullPage: true,
    });
  });

  test('在已有分类下创建子分类 shall 成功并展示在层级中', async ({ page }) => {
    // 悬停首个分类行后点击“新建子分类”
    const firstCategory = page.getByText('技术', { exact: true }).first();
    const row = firstCategory.locator('xpath=ancestor::div[contains(@class,"group")][1]');
    await row.hover();
    await row.getByRole('button', { name: 'New subcategory' }).click();
    await expect(page.getByRole('dialog', { name: 'New category' })).toBeVisible();
    await page.getByLabel('Category name').fill('SubCategory Test');
    await page.getByRole('button', { name: 'Create category' }).click();
    await expect(page.getByText('SubCategory Test', { exact: true })).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-014-subcategory-create.png'),
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
