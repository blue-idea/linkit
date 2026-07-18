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

test.describe('标签筛选', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-014-AC-001
  test('标签筛选 shall 仅显示含该标签的书签且计数准确', async ({ page }) => {
    const cssTag = page.getByLabel('Sidebar tags').getByText(/CSS \(\d+\)/);
    await expect(cssTag).toBeVisible();
    const label = await cssTag.innerText();
    const match = label.match(/CSS \((\d+)\)/);
    expect(match).toBeTruthy();
    const count = Number(match![1]);
    expect(count).toBeGreaterThan(0);

    await cssTag.click();
    await expect(page.getByText(new RegExp(`${count} 个收藏`))).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-018-tag-filter.png'),
      fullPage: true,
    });
  });
});

test.describe('标签编辑', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-014-AC-002
  test('标签编辑 shall 添加后更新详情与侧栏计数', async ({ page }) => {
    // 选中默认详情书签，添加新标签
    await page.getByLabel('Add tag').fill('TASK018 Tag');
    await page.getByLabel('Add tag').press('Enter');

    await expect(page.getByLabel('Bookmark tags').getByText('TASK018 Tag', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Sidebar tags').getByText(/TASK018 Tag \(\d+\)/)).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-018-tag-edit.png'),
      fullPage: true,
    });
  });
});
