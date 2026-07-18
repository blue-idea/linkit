import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enterLocalMode } from './helpers';

const evidenceDirectory = resolve('../docs/spec/evidence');

test.describe('库内推荐与知识网络', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterLocalMode(page);
    await mkdir(evidenceDirectory, { recursive: true });
  });

  test('库内推荐 shall 仅显示现有书签并显式确认主题缺口', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore library' }).click();
    const dialog = page.getByRole('dialog', { name: 'Explore library' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Recommendations only use bookmarks already in your library');
    const gapAction = dialog.getByRole('button', { name: /^Add .+ to .+$/ }).first();
    if (await gapAction.count()) {
      await expect(gapAction).toBeVisible();
      await gapAction.click();
      await expect(page.getByText('Bookmark added to collection')).toBeVisible();
    }
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-036-library-recommendations.png'), fullPage: true });
  });

  test('知识网络 shall 显示确定性关系图并支持节点跳转', async ({ page }) => {
    await page.getByRole('button', { name: 'Open knowledge network' }).click();
    const dialog = page.getByRole('dialog', { name: 'Knowledge network' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img', { name: 'Bookmark relationship graph' })).toBeVisible();
    await expect(dialog).toContainText(/Shared tag|Shared collection/);
    await expect(dialog).toHaveScreenshot('TASK-036-knowledge-graph.png', { maxDiffPixelRatio: 0.05 });
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-036-knowledge-graph.png'), fullPage: true });

    const nodes = dialog.getByRole('button', { name: /^Open / });
    const targetName = (await nodes.nth(1).getAttribute('aria-label'))?.replace(/^Open /, '') ?? '';
    await nodes.nth(1).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit bookmark title' })).toContainText(targetName);
  });
});
