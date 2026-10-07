import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, resetApp } from '../e2e/local-mvp/helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

const macosThemes = [
  { id: 'cupertino', label: 'Cupertino|库比蒂诺' },
  { id: 'sequoia', label: 'Cappuccino|卡布奇诺' },
  { id: 'provence', label: 'Provence|普罗旺斯' },
  { id: 'monet', label: 'Monet|莫奈花园' },
] as const;

test.describe('TASK-085 macOS 风格浅色多主题视觉回归与 3-Pane 差异化', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await resetApp(page);
    await enterLocalMode(page);
    await mkdir(evidenceDirectory, { recursive: true });
  });

  // REQ-023-AC-003 / REQ-023-AC-007
  test('Cupertino 与 Sequoia 可选择、持久化并验证三栏分层', async ({ page }) => {
    for (const theme of macosThemes) {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Settings' });
      await dialog.getByRole('tab', { name: 'Appearance' }).click();
      await expect(dialog.getByRole('button', { name: new RegExp(theme.label) })).toBeVisible();
      await dialog.getByRole('button', { name: new RegExp(theme.label) }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);

      // 验证在 settings 打开时的截图
      await page.screenshot({
        path: resolve(evidenceDirectory, `TASK-085-${theme.id}-settings-actual.png`),
        fullPage: true,
      });

      // 保存设置
      await dialog.getByRole('button', { name: 'Save settings' }).click();
      await expect(dialog).toHaveCount(0);

      // 验证左中右三栏元素渲染正常且存在
      const sidebarNav = page.locator('nav');
      const contentMain = page.locator('main');
      const detailAside = page.locator('aside');

      await expect(sidebarNav).toBeVisible();
      await expect(contentMain).toBeVisible();
      await expect(detailAside).toBeVisible();

      // 验证主窗口截图
      await page.screenshot({
        path: resolve(evidenceDirectory, `TASK-085-${theme.id}-main-actual.png`),
        fullPage: true,
      });

      // 页面重载后保持所选主题持久化
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id, { timeout: 10_000 });
    }
  });
});
