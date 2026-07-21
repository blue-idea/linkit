import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, expectLoginGate } from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

const ZH = {
  appearance: '\u5916\u89c2',
  windowSize: '\u754c\u9762\u5927\u5c0f',
  small: '\u5c0f',
  medium: '\u4e2d',
  large: '\u5927',
  xlarge: '\u8d85\u5927',
  zhongwen: '\u4e2d\u6587',
  save: '\u4fdd\u5b58\u8bbe\u7f6e',
};

test.describe('Appearance window size', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
  });

  // REQ-031-AC-001：Appearance 暴露四档窗口大小。
  test('Appearance 显示 Small Medium Large Extra large', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Appearance' }).click();

    await expect(dialog.getByText('Window size')).toBeVisible();
    for (const name of ['Small', 'Medium', 'Large', 'Extra large']) {
      await expect(dialog.getByRole('button', { name, exact: true })).toBeVisible();
    }

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-063-window-size-en.png'),
      fullPage: true,
    });
  });

  // REQ-031-AC-006：中文界面显示小/中/大/超大，档位可保存。
  test('中文 Appearance 显示小中大超大且可选择保存', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    let dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Language' }).click();
    await dialog.getByRole('button', { name: ZH.zhongwen }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: new RegExp('Save settings|' + ZH.save) }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: '\u8bbe\u7f6e', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: ZH.appearance }).click();
    await expect(dialog.getByText(ZH.windowSize)).toBeVisible();
    for (const name of [ZH.small, ZH.medium, ZH.large, ZH.xlarge]) {
      await expect(dialog.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await dialog.getByRole('button', { name: ZH.large, exact: true }).click();
    await dialog.getByRole('button', { name: ZH.save }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-063-window-size-zh.png'),
      fullPage: true,
    });
  });
});
