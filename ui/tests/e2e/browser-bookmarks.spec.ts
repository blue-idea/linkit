import { expect, test } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BROWSER_BOOKMARK_NEW_URL,
  BROWSER_BOOKMARKS_HTML,
} from '../fixtures/browser-bookmarks';
import { enterLocalMode, expectLoginGate } from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence',
);

async function openGeneralSettings(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: 'General' }).click();
  return dialog;
}

async function uploadBrowserBookmarks(dialog: import('@playwright/test').Locator) {
  await dialog.locator('[data-testid="browser-import-file-input"]').setInputFiles({
    name: 'bookmarks.html',
    mimeType: 'text/html',
    buffer: Buffer.from(BROWSER_BOOKMARKS_HTML, 'utf8'),
  });
}

test.describe('TASK-079/080 浏览器书签导入导出', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
    await enterLocalMode(page);
  });

  test('REQ-035-AC-001/006 导出浏览器兼容 HTML 且排除 Linkit 专有字段', async ({ page }) => {
    const dialog = await openGeneralSettings(page);
    const downloadPromise = page.waitForEvent('download');

    await dialog.getByRole('button', { name: 'Export browser bookmarks' }).click();

    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const raw = await readFile(path!, 'utf8');
    expect(download.suggestedFilename()).toMatch(/^linkit-bookmarks-\d{4}-\d{2}-\d{2}\.html$/);
    expect(raw).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(raw).toContain('<DL><p>');
    expect(raw).toContain('<A HREF="https://vitejs.dev"');
    for (const forbiddenField of [
      'tagIds',
      'collectionIds',
      'notes',
      'aiSummary',
      'healthCheckedAt',
      'readStatus',
      'settingsVersion',
    ]) {
      expect(raw).not.toContain(forbiddenField);
    }
  });

  test('REQ-035-AC-002~005 导入先显示摘要，取消零副作用，确认后追加且 AI 不可用不阻塞', async ({ page }) => {
    const dialog = await openGeneralSettings(page);
    await uploadBrowserBookmarks(dialog);

    let confirm = page.getByRole('dialog', { name: 'Import browser bookmarks?' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByTestId('import-summary')).toHaveText(
      '1 folders · 2 bookmarks · 1 new · 1 skipped duplicates',
    );
    await mkdir(evidenceDirectory, { recursive: true });
    await confirm.screenshot({
      path: resolve(evidenceDirectory, 'TASK-079-browser-import-summary-actual.png'),
      animations: 'disabled',
    });

    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toHaveCount(0);
    expect(await page.evaluate((url) => document.body.textContent?.includes(url), BROWSER_BOOKMARK_NEW_URL)).toBe(false);

    await uploadBrowserBookmarks(dialog);
    confirm = page.getByRole('dialog', { name: 'Import browser bookmarks?' });
    await confirm.getByRole('button', { name: 'Import bookmarks' }).click();

    await expect(dialog.getByText('Imported 1 bookmarks', { exact: true })).toBeVisible();
    await expect.poll(async () => page.evaluate((url) => {
      const raw = localStorage.getItem('linkit.library.v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        data?: {
          bookmarks?: Array<{ url: string; categoryId: string | null }>;
          categories?: Array<{ id: string; name: string }>;
        };
      };
      const bookmark = parsed.data?.bookmarks?.find((item) => item.url === url);
      const category = parsed.data?.categories?.find((item) => item.name === 'Browser Toolbar');
      return Boolean(bookmark && category && bookmark.categoryId === category.id);
    }, BROWSER_BOOKMARK_NEW_URL)).toBe(true);
  });
});
