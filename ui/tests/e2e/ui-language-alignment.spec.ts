import { expect, test } from '@playwright/test';
import { enterLocalMode, expectLoginGate } from './helpers';

test.describe('全界面语言与设置对齐', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
    await enterLocalMode(page);
  });

  // REQ-023-AC-004 / REQ-023-AC-008
  test('English 设置覆盖主界面筛选、状态与操作文案', async ({ page }) => {
    await expect(page.getByPlaceholder('Search or use semantic search…')).toBeVisible();
    await expect(page.getByLabel('Filter by read status').locator('option').first()).toHaveText('All statuses');
    await expect(page.getByLabel('Sort bookmarks').locator('option').first()).toHaveText('Recently visited');
    await expect(page.getByRole('button', { name: 'New Bookmark' })).toBeVisible();
    await expect(page.getByPlaceholder('搜索或使用语义查找…')).toHaveCount(0);
  });

  // REQ-023-AC-005 / REQ-023-AC-008
  test('切换中文后主界面和新建书签对话框同步更新且自定义内容不变', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('tab', { name: 'Language' }).click();
    await settings.getByRole('button', { name: '中文' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '保存设置' }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    await expect(page.getByPlaceholder('搜索或使用语义查找…')).toBeVisible();
    await expect(page.getByLabel('按阅读状态筛选').locator('option').first()).toHaveText('所有状态');
    await expect(page.getByLabel('书签排序').locator('option').first()).toHaveText('最近访问');
    await expect(page.getByText('Coolors — 超快配色方案生成器', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: '新增', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '新建书签' });
    await expect(dialog.getByRole('textbox', { name: '书签标题提示' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: '取消' })).toBeVisible();
  });
});
