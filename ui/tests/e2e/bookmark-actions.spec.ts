import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { additiveSelectionModifier } from '../../src/config/playwright-modifiers';
import { enterLocalMode } from './helpers';

const evidenceDirectory = resolve('../docs/spec/evidence');

test.describe('书签操作与批量操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterLocalMode(page);
    await mkdir(evidenceDirectory, { recursive: true });
  });

  test('可见入口打开包含 URL 和 Notes 的统一编辑对话框', async ({ page }) => {
    const main = page.getByRole('main', { name: 'Content Area' });
    await expect(main.getByRole('checkbox', { name: /Select bookmark/ })).toHaveCount(0);
    await expect(main.getByRole('button', { name: 'Edit bookmark' }).first()).toBeVisible();
    await main.getByRole('button', { name: 'Edit bookmark' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Edit bookmark' });
    await expect(dialog.getByLabel('URL')).toBeVisible();
    await expect(dialog.getByLabel('Notes')).toBeVisible();
    await dialog.getByLabel('Title').fill('Edited from unified dialog');
    await dialog.getByLabel('URL').fill('https://example.com/edited');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Edited from unified dialog', { exact: true }).first()).toBeVisible();
  });

  test('批量移动和批量删除显示固定操作栏并保持确认门禁', async ({ page }) => {
    const main = page.getByRole('main', { name: 'Content Area' });
    await expect(main.getByRole('checkbox', { name: /Select bookmark/ })).toHaveCount(0);
    await main.getByRole('button', { name: 'Select bookmarks' }).click();
    await expect(main.getByRole('button', { name: 'Done selecting' })).toBeVisible();
    const additiveModifier = additiveSelectionModifier(process.platform);
    await main.getByText('Figma — 协作式界面设计工具', { exact: true }).click();
    await main.getByText('React 官方文档', { exact: true }).click({ modifiers: [additiveModifier] });
    let toolbar = main.getByRole('toolbar', { name: 'Bulk bookmark actions' });
    await expect(toolbar.getByText('2 bookmarks selected')).toBeVisible();
    await toolbar.getByRole('button', { name: 'Clear selection' }).click();

    await main.getByText('Figma — 协作式界面设计工具', { exact: true }).click();
    await main.getByText('Coolors — 超快配色方案生成器', { exact: true }).click({ modifiers: ['Shift'] });
    toolbar = main.getByRole('toolbar', { name: 'Bulk bookmark actions' });
    await expect(toolbar.getByText('3 bookmarks selected')).toBeVisible();
    await toolbar.getByRole('button', { name: 'Clear selection' }).click();

    const checkboxes = main.getByRole('checkbox', { name: /Select bookmark/ });
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    toolbar = main.getByRole('toolbar', { name: 'Bulk bookmark actions' });
    await expect(toolbar.getByText('2 bookmarks selected')).toBeVisible();
    await toolbar.getByRole('button', { name: 'Move' }).click();
    const moveDialog = page.getByRole('dialog', { name: 'Move bookmarks' });
    await moveDialog.getByLabel('Target category').selectOption({ index: 1 });
    await moveDialog.getByRole('button', { name: 'Move bookmarks' }).click();
    await expect(toolbar).toHaveCount(0);

    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await main.getByRole('toolbar', { name: 'Bulk bookmark actions' }).getByRole('button', { name: 'Delete' }).click();
    const deleteDialog = page.getByRole('dialog', { name: 'Delete bookmarks' });
    await expect(deleteDialog.getByText('Delete 2 bookmarks?')).toBeVisible();
    await expect(deleteDialog).toHaveScreenshot('TASK-045-bulk-delete.png', { maxDiffPixelRatio: 0.05 });
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-045-bookmark-actions.png'), fullPage: true });
    await deleteDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(main.getByRole('toolbar', { name: 'Bulk bookmark actions' })).toBeVisible();
    await main.getByRole('button', { name: 'Done selecting' }).click();
    await expect(main.getByRole('checkbox', { name: /Select bookmark/ })).toHaveCount(0);
  });

  test('所有视图在书签项底部显示操作区并按选择模式显示复选框', async ({ page }) => {
    const main = page.getByRole('main', { name: 'Content Area' });
    const views = [
      ['Card view', 'Card view'],
      ['List view', 'List view'],
      ['Masonry view', 'Masonry view'],
      ['Timeline view', 'Timeline view'],
      ['Tag Aggregation view', 'Tag Aggregation view'],
      ['Theme Space view', 'Theme Space view'],
    ] as const;

    for (const [buttonName, regionName] of views) {
      await main.getByRole('button', { name: buttonName }).click();
      const view = main.getByLabel(regionName);
      await expect(view.getByRole('button', { name: 'Edit bookmark' }).first()).toBeVisible();
      await expect(view.getByRole('button', { name: 'Move bookmark' }).first()).toBeVisible();
      await expect(view.getByRole('button', { name: 'Delete bookmark' }).first()).toBeVisible();
      await expect(view.getByRole('checkbox', { name: /Select bookmark/ })).toHaveCount(0);
      await main.getByRole('button', { name: 'Select bookmarks' }).click();
      await expect(view.getByRole('checkbox', { name: /Select bookmark/ }).first()).toBeVisible();
      await main.getByRole('button', { name: 'Done selecting' }).click();
    }
  });

  test('所有视图提供区别于详情 Visit 的书签项直接访问入口', async ({ page }) => {
    const main = page.getByRole('main', { name: 'Content Area' });
    await page.evaluate(() => {
      window.open = ((url: string | URL | undefined) => {
        window.localStorage.setItem('last-opened-url', String(url ?? ''));
        return window;
      }) as typeof window.open;
    });
    await expect(page.getByRole('button', { name: 'Open bookmark URL' })).toBeVisible();
    const views = [
      ['Card view', 'Card view'],
      ['List view', 'List view'],
      ['Masonry view', 'Masonry view'],
      ['Timeline view', 'Timeline view'],
      ['Tag Aggregation view', 'Tag Aggregation view'],
      ['Theme Space view', 'Theme Space view'],
    ] as const;

    for (const [buttonName, regionName] of views) {
      await main.getByRole('button', { name: buttonName }).click();
      const view = main.getByLabel(regionName);
      const directAccess = view.getByRole('button', { name: 'Open bookmark directly' }).first();
      await expect(directAccess).toBeVisible();
      if (buttonName === 'Card view') {
        await expect(main).toHaveScreenshot('TASK-048-direct-access-baseline.png', { maxDiffPixelRatio: 0.15 });
        await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-048-direct-access.png'), fullPage: true });
      }
      await directAccess.click();
      await expect
        .poll(() => page.evaluate(() => window.localStorage.getItem('last-opened-url')))
        .toMatch(/^https?:\/\//);
      await expect(page.getByRole('dialog', { name: 'Edit bookmark' })).toHaveCount(0);
    }
  });
});
