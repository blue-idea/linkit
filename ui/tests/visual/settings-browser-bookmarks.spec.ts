import { expect, test } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BROWSER_BOOKMARKS_HTML } from '../fixtures/browser-bookmarks';
import { enterLocalMode, expectLoginGate } from '../e2e/helpers';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = resolve(testDirectory, '../../../docs/spec/evidence');
const snapshotDirectory = resolve(testDirectory, 'settings-browser-bookmarks.spec.ts-snapshots');

async function prepare(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expectLoginGate(page);
  await enterLocalMode(page);
}

async function uploadBrowserBookmarks(dialog: import('@playwright/test').Locator) {
  await dialog.locator('[data-testid="browser-import-file-input"]').setInputFiles({
    name: 'bookmarks.html',
    mimeType: 'text/html',
    buffer: Buffer.from(BROWSER_BOOKMARKS_HTML, 'utf8'),
  });
}

async function saveEvidence(
  dialog: import('@playwright/test').Locator,
  snapshotName: string,
  evidencePrefix: string,
) {
  await expect(dialog).toHaveScreenshot(snapshotName, {
    animations: 'disabled',
    maxDiffPixelRatio: 0.05,
  });
  await mkdir(evidenceDirectory, { recursive: true });
  await copyFile(
    resolve(snapshotDirectory, snapshotName),
    resolve(evidenceDirectory, `${evidencePrefix}-baseline.png`),
  );
  await dialog.screenshot({
    path: resolve(evidenceDirectory, `${evidencePrefix}-actual.png`),
    animations: 'disabled',
  });
}

test.describe('TASK-079 浏览器书签 Settings 视觉回归', () => {
  test('General 页面浏览器导入导出入口匹配基线', async ({ page }) => {
    await prepare(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('tab', { name: 'General' }).click();
    await expect(settings.getByRole('button', { name: 'Export browser bookmarks' })).toBeVisible();
    await expect(settings.getByRole('button', { name: 'Import browser bookmarks' })).toBeVisible();
    await saveEvidence(
      settings,
      'TASK-079-settings-browser-bookmarks-general-en.png',
      'TASK-079-settings-browser-bookmarks-general-en',
    );
  });

  test('English import summary matches baseline', async ({ page }) => {
    await prepare(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('tab', { name: 'General' }).click();
    await uploadBrowserBookmarks(settings);

    const confirm = page.getByRole('dialog', { name: 'Import browser bookmarks?' });
    await expect(confirm.getByTestId('import-summary')).toContainText('1 skipped duplicates');
    await saveEvidence(
      confirm,
      'TASK-079-settings-browser-bookmarks-en.png',
      'TASK-079-settings-browser-bookmarks-en',
    );
  });

  test('中文导入摘要匹配基线', async ({ page }) => {
    await prepare(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    let settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('tab', { name: 'Language' }).click();
    await settings.getByRole('button', { name: '中文' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '保存设置' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: '设置', exact: true }).click();
    settings = page.getByRole('dialog', { name: '设置' });
    await settings.getByRole('tab', { name: '通用' }).click();
    await uploadBrowserBookmarks(settings);

    const confirm = page.getByRole('dialog', { name: '导入浏览器书签？' });
    await expect(confirm.getByTestId('import-summary')).toContainText('1 个重复已跳过');
    await saveEvidence(
      confirm,
      'TASK-079-settings-browser-bookmarks-zh.png',
      'TASK-079-settings-browser-bookmarks-zh',
    );
  });
});
