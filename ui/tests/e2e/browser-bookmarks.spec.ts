import { expect, test } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BROWSER_BOOKMARK_NEW_URL,
  BROWSER_BOOKMARKS_HTML,
  BROWSER_BOOKMARKS_FOLDER_HTML,
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

async function uploadBrowserBookmarks(
  dialog: import('@playwright/test').Locator,
  html = BROWSER_BOOKMARKS_HTML,
) {
  await dialog.locator('[data-testid="browser-import-file-input"]').setInputFiles({
    name: 'bookmarks.html',
    mimeType: 'text/html',
    buffer: Buffer.from(html, 'utf8'),
  });
}

test.describe('TASK-079/080/081 浏览器书签导入导出', () => {
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
      '0 folders · 2 bookmarks · 1 new · 1 skipped duplicates',
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
      if (!raw) return false;
      const parsed = JSON.parse(raw) as {
        data?: {
          bookmarks?: Array<{ url: string; categoryId: string | null }>;
          categories?: Array<{ id: string; name: string }>;
        };
      };
      const bookmark = parsed.data?.bookmarks?.find((item) => item.url === url);
      const virtualRoot = parsed.data?.categories?.some((item) => item.name === 'Browser Toolbar');
      // 根层在 domain envelope 中使用 null，旧 UI 兼容键可能使用空字符串。
      return Boolean(bookmark && !virtualRoot && (bookmark.categoryId === null || bookmark.categoryId === ''));
    }, BROWSER_BOOKMARK_NEW_URL)).toBe(true);
  });

  test('REQ-035-AC-007/010 导入期间显示 metadata 进度并持久化补全字段', async ({ page }) => {
    await page.addInitScript(() => {
      const metadataService = {
        FetchMetadata: ({ url }: { url: string }) => new Promise((resolve) => {
          window.setTimeout(() => resolve({
            title: `Metadata title for ${url}`,
            description: 'Imported metadata description',
            contentText: 'Imported metadata content',
            faviconUrl: 'https://example.com/imported-favicon.ico',
            faviconDataUrl: null,
          }), 900);
        }),
      };
      (window as unknown as { go?: unknown }).go = { metadata: { Service: metadataService } };
    });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
    await enterLocalMode(page);

    const dialog = await openGeneralSettings(page);
    await uploadBrowserBookmarks(dialog);
    const confirm = page.getByRole('dialog', { name: 'Import browser bookmarks?' });
    await confirm.getByRole('button', { name: 'Import bookmarks' }).click();

    await expect(confirm.getByRole('progressbar')).toBeVisible();
    await expect(confirm.getByTestId('import-progress-stage')).toHaveText('Fetching metadata');
    await expect(confirm.getByTestId('import-progress-count')).toHaveText('0 / 1');
    await mkdir(evidenceDirectory, { recursive: true });
    await confirm.screenshot({
      path: resolve(evidenceDirectory, 'TASK-081-import-progress-actual.png'),
      animations: 'disabled',
    });

    await expect(dialog.getByText('Imported 1 bookmarks', { exact: true })).toBeVisible();
    await expect.poll(async () => page.evaluate((url) => {
      const raw = localStorage.getItem('linkit.library.v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        data?: { bookmarks?: Array<{ url: string; title: string; description: string; favicon: string | null }> };
      };
      return parsed.data?.bookmarks?.find((item) => item.url === url) ?? null;
    }, BROWSER_BOOKMARK_NEW_URL)).toMatchObject({
      title: `Metadata title for ${BROWSER_BOOKMARK_NEW_URL}`,
      description: 'Imported metadata description',
      favicon: 'https://example.com/imported-favicon.ico',
    });
  });

  // REQ-010-AC-005 / REQ-035-AC-003：递归删除后再次导入同一 URL 必须计为新增。
  test('递归删除导入分类和书签后重新导入显示新增', async ({ page }) => {
    const dialog = await openGeneralSettings(page);
    await uploadBrowserBookmarks(dialog, BROWSER_BOOKMARKS_FOLDER_HTML);
    let confirm = page.getByRole('dialog', { name: 'Import browser bookmarks?' });
    await expect(confirm.getByTestId('import-summary')).toHaveText(
      '1 folders · 1 bookmarks · 1 new · 0 skipped duplicates',
    );
    await confirm.getByRole('button', { name: 'Import bookmarks' }).click();
    await expect(dialog.getByText('Imported 1 bookmarks', { exact: true })).toBeVisible();
    await expect.poll(async () => page.evaluate((url) => {
      const raw = localStorage.getItem('linkit.library.v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        data?: {
          bookmarks?: Array<{ id: string; url: string; categoryId: string | null }>;
          categories?: Array<{ id: string; name: string }>;
        };
      };
      const bookmark = parsed.data?.bookmarks?.find((item) => item.url === url);
      const category = parsed.data?.categories?.find((item) => item.name === 'Imported Folder');
      return bookmark && category ? { bookmarkId: bookmark.id, categoryId: category.id } : null;
    }, BROWSER_BOOKMARK_NEW_URL)).not.toBeNull();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    const categoryRow = page.locator('[data-category-drop="Imported Folder"]');
    await expect(categoryRow).toBeVisible();
    await categoryRow.hover();
    await categoryRow.getByRole('button', { name: 'Delete category' }).click();
    const deleteDialog = page.getByRole('dialog', { name: 'Delete this category?' });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete recursively' }).click();
    const recursiveDialog = page.getByRole('dialog', { name: 'Confirm recursive delete?' });
    await expect(recursiveDialog).toBeVisible();
    await recursiveDialog.getByRole('button', { name: 'Confirm recursive delete' }).click();
    await expect(page.locator('[data-category-drop="Imported Folder"]')).toHaveCount(0);

    await expect.poll(async () => page.evaluate((url) => {
      const raw = localStorage.getItem('linkit.library.v1');
      const legacyRaw = localStorage.getItem('lattice.library');
      const parseUrls = (value: string | null) => {
        if (!value) return [] as string[];
        try {
          const parsed = JSON.parse(value) as { data?: { bookmarks?: Array<{ url: string }> }; bookmarks?: Array<{ url: string }> };
          return (parsed.data?.bookmarks ?? parsed.bookmarks ?? []).map((item) => item.url);
        } catch {
          return ['<invalid>'];
        }
      };
      return {
        linkitUrls: parseUrls(raw),
        legacyUrls: parseUrls(legacyRaw),
        hasTargetInLinkit: parseUrls(raw).includes(url),
        hasTargetInLegacy: parseUrls(legacyRaw).includes(url),
      };
    }, BROWSER_BOOKMARK_NEW_URL)).toMatchObject({
      hasTargetInLinkit: false,
      hasTargetInLegacy: false,
    });

    const reopened = await openGeneralSettings(page);
    await uploadBrowserBookmarks(reopened, BROWSER_BOOKMARKS_FOLDER_HTML);
    confirm = page.getByRole('dialog', { name: 'Import browser bookmarks?' });
    await expect(confirm.getByTestId('import-summary')).toHaveText(
      '1 folders · 1 bookmarks · 1 new · 0 skipped duplicates',
    );
  });
});
