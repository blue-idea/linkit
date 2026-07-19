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

async function selectTwoBookmarks(page: import('@playwright/test').Page) {
  // TASK-045：多选需先进入选择模式，再勾选书签。
  await page.getByRole('button', { name: 'Select bookmarks' }).click();
  await page.getByRole('checkbox', { name: /Select bookmark Coolors/i }).check();
  await page.getByRole('checkbox', { name: /Select bookmark Font Pair/i }).check();
  await expect(page.getByRole('button', { name: 'Create collection from selection' })).toBeVisible();
}

test.describe('创建主题组合', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-013-AC-001：预览列出成员且取消不持久化
  test('创建主题组合 shall 显示预览且取消不产生主题', async ({ page }) => {
    await selectTwoBookmarks(page);
    await page.getByRole('button', { name: 'Create collection from selection' }).click();

    await expect(page.getByRole('dialog', { name: 'Create collection from selection' })).toBeVisible();
    const members = page.getByRole('list', { name: 'Compose preview members' });
    await expect(members).toBeVisible();
    await expect(members.getByRole('listitem')).toHaveCount(2);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-017-compose-preview.png'),
      fullPage: true,
    });

    const beforeCount = await page.getByText('Drop selection to create collection').count();
    expect(beforeCount).toBe(1);

    await page.getByRole('button', { name: 'Cancel compose collection' }).click();
    await expect(page.getByRole('dialog', { name: 'Create collection from selection' })).toHaveCount(0);
    await expect(page.getByText('TASK017 Cancelled Theme', { exact: true })).toHaveCount(0);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-017-compose-cancel.png'),
      fullPage: true,
    });
  });

  // REQ-013-AC-002：确认后创建主题与双向成员
  test('创建主题组合 shall 确认后创建主题并包含所选成员', async ({ page }) => {
    await selectTwoBookmarks(page);
    await page.getByRole('button', { name: 'Create collection from selection' }).click();
    await page.getByLabel('Compose collection name').fill('TASK017 Composed Theme');
    await page.getByRole('button', { name: 'Confirm compose collection' }).click();

    await expect(page.getByText('TASK017 Composed Theme', { exact: true }).first()).toBeVisible();
    await page.getByText('TASK017 Composed Theme', { exact: true }).first().click();
    await expect(page.getByText(/2 个收藏/)).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-017-compose-confirm.png'),
      fullPage: true,
    });
  });
});
