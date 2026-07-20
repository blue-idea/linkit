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

test.describe('主题视图手动添加书签', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-012-AC-006 / AC-007 / AC-008 / AC-009
  test('主题视图添加书签 shall 支持搜索多选且确认前零副作用', async ({ page }) => {
    await page.getByText('周末长读', { exact: true }).first().click();
    const contentArea = page.getByRole('main', { name: 'Content Area' });
    await expect(contentArea).toContainText(/3 bookmarks/);
    await expect(page.getByRole('button', { name: 'Add bookmarks' })).toBeVisible();

    await page.getByRole('button', { name: 'Add bookmarks' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add bookmarks' });
    await expect(dialog).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await dialog.screenshot({
      path: resolve(evidenceDirectory, 'TASK-053-add-bookmarks-picker.png'),
    });

    await page.getByLabel('Search bookmarks').fill('Coolors');
    await expect(dialog.getByText(/Coolors/)).toBeVisible();
    await dialog.getByRole('checkbox', { name: /Select Coolors/i }).check();

    await page.getByRole('button', { name: 'Cancel add bookmarks' }).click();
    await expect(dialog).toBeHidden();
    await expect(contentArea).toContainText(/3 bookmarks/);

    await page.getByRole('button', { name: 'Add bookmarks' }).click();
    await page.getByLabel('Search bookmarks').fill('Coolors');
    await page.getByRole('checkbox', { name: /Select Coolors/i }).check();
    await page.getByRole('button', { name: 'Confirm add bookmarks' }).click();
    await expect(page.getByRole('dialog', { name: 'Add bookmarks' })).toBeHidden();
    await expect(contentArea).toContainText(/4 bookmarks/);
    await expect(page.getByText(/Coolors/).first()).toBeVisible();
  });

  // REQ-012-AC-010
  test('空主题 shall 显示 Add bookmarks CTA 并打开同一挑选器', async ({ page }) => {
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByLabel('Collection name').fill('TASK053 Empty Theme');
    await page.getByRole('button', { name: 'Create collection', exact: true }).click();
    await page.getByText('TASK053 Empty Theme', { exact: true }).first().click();

    await expect(page.getByRole('button', { name: 'Add bookmarks' }).first()).toBeVisible();
    const emptyCta = page.getByRole('button', { name: 'Add bookmarks' }).nth(1);
    await expect(emptyCta).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-053-empty-add-cta.png'),
      fullPage: true,
    });

    await emptyCta.click();
    await expect(page.getByRole('dialog', { name: 'Add bookmarks' })).toBeVisible();
  });

  // REQ-012-AC-011
  test('主题视图移出 shall 单条即时生效且多选确认前零副作用', async ({ page }) => {
    await page.getByText('周末长读', { exact: true }).first().click();
    const contentArea = page.getByRole('main', { name: 'Content Area' });
    await expect(contentArea).toContainText(/3 bookmarks/);

    // 使用书签项操作区的移出按钮
    await page.getByRole('button', { name: 'Remove from collection' }).first().click();
    await expect(contentArea).toContainText(/2 bookmarks/);

    await page.getByRole('button', { name: 'Select bookmarks' }).click();
    await page.getByRole('checkbox', { name: /Select bookmark/i }).first().check();
    await page.getByRole('checkbox', { name: /Select bookmark/i }).nth(1).check();
    await expect(page.getByRole('button', { name: 'Remove from collection' }).last()).toBeVisible();

    await page.getByRole('toolbar', { name: 'Bulk bookmark actions' }).getByRole('button', { name: 'Remove from collection' }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove from collection' });
    await expect(dialog).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await dialog.screenshot({
      path: resolve(evidenceDirectory, 'TASK-054-remove-from-collection.png'),
    });

    await page.getByRole('button', { name: 'Cancel remove from collection' }).click();
    await expect(contentArea).toContainText(/2 bookmarks/);

    await page.getByRole('toolbar', { name: 'Bulk bookmark actions' }).getByRole('button', { name: 'Remove from collection' }).click();
    await page.getByRole('button', { name: 'Confirm remove from collection' }).click();
    await expect(contentArea).toContainText(/0 bookmarks/);

    // 书签仍在资料库（All bookmarks）。
    await page.getByText('All bookmarks', { exact: true }).first().click();
    await expect(contentArea).toContainText(/20 bookmarks|19 bookmarks|18 bookmarks/);
  });
});
