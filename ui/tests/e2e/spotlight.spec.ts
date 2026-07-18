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

/** Chromium 会吞掉 Ctrl+K；派发等价 keydown 以验证应用快捷键处理。 */
async function openSpotlightWithShortcut(page: import('@playwright/test').Page) {
  await page.locator('body').click();
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
  });
}

test.describe('Spotlight 关键词与 URL', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-017-AC-001
  test('Spotlight 关键词 shall 由 Cmd/Ctrl+K 打开并聚焦搜索框', async ({ page }) => {
    await openSpotlightWithShortcut(page);
    await expect(page.getByRole('dialog', { name: 'Spotlight' })).toBeVisible();
    await expect(page.getByLabel('Spotlight search')).toBeFocused();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-021-spotlight-open.png'),
      fullPage: true,
    });
  });

  // REQ-017-AC-002 / REQ-017-AC-003
  test('Spotlight 关键词 shall 匹配结果可选中并关闭 Spotlight', async ({ page }) => {
    await openSpotlightWithShortcut(page);
    const search = page.getByLabel('Spotlight search');
    await search.fill('Coolors');
    const result = page.getByRole('option', { name: /Coolors/i }).first();
    await expect(result).toBeVisible();
    await result.click();

    await expect(page.getByRole('dialog', { name: 'Spotlight' })).toHaveCount(0);
    await expect(page.getByLabel('Edit bookmark title')).toContainText(/Coolors/i);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-021-spotlight-select.png'),
      fullPage: true,
    });
  });

  // REQ-017-AC-004
  test('URL 快捷入库 shall 打开 New Bookmark 预览且确认前不保存', async ({ page }) => {
    await expect(page.locator('[data-view-item]').first()).toBeVisible();

    await openSpotlightWithShortcut(page);
    await page.getByLabel('Spotlight search').fill('https://example.test/spotlight-url');
    await expect(page.getByRole('button', { name: 'New Bookmark' })).toBeVisible();
    await page.getByRole('button', { name: 'New Bookmark' }).click();

    await expect(page.getByRole('heading', { name: 'New Bookmark' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Bookmark URL' })).toHaveValue(
      'https://example.test/spotlight-url'
    );

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'New Bookmark' })).toHaveCount(0);
    // 确认前取消：资料库中不应出现该 URL 书签。
    await expect(page.getByText('example.test/spotlight-url')).toHaveCount(0);

    await mkdir(evidenceDirectory, { recursive: true });
    await openSpotlightWithShortcut(page);
    await page.getByLabel('Spotlight search').fill('https://example.test/spotlight-url');
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-021-url-new-bookmark.png'),
      fullPage: true,
    });
  });
});
