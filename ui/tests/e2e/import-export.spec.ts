import { expect, test } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, expectLoginGate } from './helpers';

const here = dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = resolve(here, '../../../docs/spec/evidence');
const fixtures = resolve(here, '../fixtures');

async function openSettingsGeneral(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: 'General' }).click();
  return dialog;
}

test.describe('JSON import export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
    await enterLocalMode(page);
  });

  // REQ-005-AC-001
  test('JSON export downloads versioned library envelope', async ({ page }) => {
    const dialog = await openSettingsGeneral(page);
    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export', exact: true }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const raw = await readFile(path!, 'utf8');
    const parsed = JSON.parse(raw) as {
      format: string;
      schemaVersion: number;
      data: { bookmarks: unknown[]; categories: unknown[]; collections: unknown[]; tags: unknown[] };
    };
    expect(parsed.format).toBe('linkit-library');
    expect(parsed.schemaVersion).toBe(1);
    expect(Array.isArray(parsed.data.bookmarks)).toBe(true);
    expect(Array.isArray(parsed.data.categories)).toBe(true);
    expect(Array.isArray(parsed.data.collections)).toBe(true);
    expect(Array.isArray(parsed.data.tags)).toBe(true);
    expect(raw).not.toContain('apiKey');

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-024-export-en.png'),
      fullPage: true,
    });
  });

  // REQ-005-AC-002
  test('JSON import shows summary and applies only after overwrite confirm', async ({ page }) => {
    const dialog = await openSettingsGeneral(page);

    await dialog.locator('[data-testid="import-file-input"]').setInputFiles(resolve(fixtures, 'valid-library.json'));
    const confirm = page.getByRole('dialog', { name: 'Overwrite current library?' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByTestId('import-summary')).toContainText('1 bookmarks');

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-024-import-confirm-en.png'),
      fullPage: true,
    });

    // Cancel keeps library unchanged
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { name: 'Overwrite current library?' })).toHaveCount(0);

    await dialog.locator('[data-testid="import-file-input"]').setInputFiles(resolve(fixtures, 'valid-library.json'));
    await expect(page.getByRole('dialog', { name: 'Overwrite current library?' })).toBeVisible();
    await page.getByRole('button', { name: 'Overwrite and import' }).click();
    await expect(page.getByText('Imported 1 bookmarks')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);

    await expect(page.getByRole('main', { name: 'Content Area' }).getByText('Imported Alpha')).toBeVisible();
  });

  // REQ-005-AC-003
  test('JSON import rejects invalid file without changing library', async ({ page }) => {
    await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
    const dialog = await openSettingsGeneral(page);
    const bookmarkCountBefore = await page.evaluate(() => {
      const raw = localStorage.getItem('lattice.library');
      if (!raw) return -1;
      try {
        return (JSON.parse(raw) as { bookmarks?: unknown[] }).bookmarks?.length ?? -1;
      } catch {
        return -1;
      }
    });

    await dialog.locator('[data-testid="import-file-input"]').setInputFiles(resolve(fixtures, 'invalid-library.json'));
    await expect(dialog.getByTestId('import-error')).toHaveText('Import file is invalid');
    await expect(page.getByRole('dialog', { name: 'Overwrite current library?' })).toHaveCount(0);

    const bookmarkCountAfter = await page.evaluate(() => {
      const raw = localStorage.getItem('lattice.library');
      if (!raw) return -1;
      try {
        return (JSON.parse(raw) as { bookmarks?: unknown[] }).bookmarks?.length ?? -1;
      } catch {
        return -1;
      }
    });
    expect(bookmarkCountAfter).toBe(bookmarkCountBefore);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-024-import-invalid-en.png'),
      fullPage: true,
    });
  });

  // REQ-023-AC-005 / REQ-023-AC-006
  test('JSON import overwrite UI localizes to Chinese', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    let dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Language' }).click();
    await dialog.getByRole('button', { name: '\u4e2d\u6587' }).click();
    // 草稿切 zh 后 dialog 名称变为中文
    await page.getByRole('dialog').getByRole('button', { name: /Save settings|\u4fdd\u5b58\u8bbe\u7f6e/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: '\u8bbe\u7f6e', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: '\u901a\u7528' }).click();
    await dialog.locator('[data-testid="import-file-input"]').setInputFiles(resolve(fixtures, 'valid-library.json'));

    const confirm = page.getByRole('dialog', { name: '\u8986\u76d6\u5f53\u524d\u8d44\u6599\u5e93\uff1f' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole('button', { name: '\u8986\u76d6\u5e76\u5bfc\u5165' })).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-024-import-confirm-zh.png'),
      fullPage: true,
    });

    await confirm.getByRole('button', { name: '\u53d6\u6d88' }).click();
    await dialog.locator('[data-testid="import-file-input"]').setInputFiles(resolve(fixtures, 'invalid-library.json'));
    await expect(dialog.getByTestId('import-error')).toHaveText('\u5bfc\u5165\u6587\u4ef6\u65e0\u6548');
  });
});
