import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '使用本地模式（无需登录）' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

test.describe('主题 CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: '使用本地模式（无需登录）' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-012-AC-001
  test('主题创建 shall 在侧栏显示最新主题元数据', async ({ page }) => {
    await page.getByRole('button', { name: 'New collection' }).click();
    await expect(page.getByRole('dialog', { name: 'New collection' })).toBeVisible();
    await page.getByLabel('Collection name').fill('TASK016 Theme CRUD');
    await page.getByLabel('Collection emoji').fill('🎯');
    await page.getByRole('button', { name: 'Color coral' }).click();
    await page.getByLabel('Collection description').fill('Created by TASK-016 E2E');
    await page.getByRole('button', { name: 'Create collection' }).click();

    // 侧栏与详情面板可能同时出现同名文本，取侧栏首个即可。
    await expect(page.getByText('TASK016 Theme CRUD', { exact: true }).first()).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-016-collection-create.png'),
      fullPage: true,
    });
  });

  // REQ-012-AC-004
  test('打开主题 shall 仅显示成员且计数准确', async ({ page }) => {
    await page.getByText('设计灵感', { exact: true }).first().click();
    await expect(page.getByText('设计灵感', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/5 个收藏/)).toBeVisible();
    await expect(page.getByText('Coolors', { exact: false }).first()).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-016-collection-members.png'),
      fullPage: true,
    });
  });
});

test.describe('主题成员', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: '使用本地模式（无需登录）' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-012-AC-002 / REQ-012-AC-003：删除确认与成员保留
  test('主题删除 shall 确认后移除主题并保留书签', async ({ page }) => {
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByLabel('Collection name').fill('TASK016 Disposable');
    await page.getByRole('button', { name: 'Create collection' }).click();
    await expect(page.getByText('TASK016 Disposable', { exact: true }).first()).toBeVisible();

    const row = page.getByText('TASK016 Disposable', { exact: true }).first();
    await row.hover();
    await page.getByRole('button', { name: 'Delete collection' }).last().click();
    await expect(page.getByRole('dialog', { name: 'Delete this collection?' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm delete collection' }).click();
    await expect(page.getByText('TASK016 Disposable', { exact: true })).toHaveCount(0);

    // 删除后应回到全部收藏；书签仍保留
    await expect(page.getByRole('heading', { name: '全部收藏' })).toBeVisible();
    await expect(page.getByText('Coolors', { exact: false }).first()).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-016-collection-delete.png'),
      fullPage: true,
    });
  });
});
