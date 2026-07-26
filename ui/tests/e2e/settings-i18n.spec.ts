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
  zhongwen: '\u4e2d\u6587',
  save: '\u4fdd\u5b58\u8bbe\u7f6e',
  settings: '\u8bbe\u7f6e',
  search: '\u641c\u7d22',
};

test.describe('Settings theme locale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
  });

  // REQ-023-AC-004
  test('first launch shows English local mode entry', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await expect(page.locator('form').getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  // REQ-023-AC-001 / REQ-023-AC-002
  test('settings exposes sections with storage capacity', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();

    for (const name of ['General', 'Storage', 'AI', 'Appearance', 'Language', 'Shortcuts']) {
      await expect(dialog.getByRole('tab', { name })).toBeVisible();
    }

    await dialog.getByRole('tab', { name: 'Storage' }).click();
    await expect(dialog.getByText('Local storage')).toBeVisible();
    await expect(dialog.getByText('Library capacity')).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-023-settings-sections.png'),
      fullPage: true,
    });
  });

  test('settings shall stay open after backdrop click', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();

    await page.mouse.click(16, 16);
    await expect(dialog).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-023-settings-backdrop-click.png'),
      fullPage: true,
    });
  });

  test('settings shall stay open after dragging text selection to backdrop', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('tab', { name: 'Storage' }).click();
    const dragSource = dialog.getByText('Library capacity');
    await expect(dragSource).toBeVisible();

    const box = await dragSource.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      throw new Error('Library capacity bounding box unavailable');
    }

    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(12, 12, { steps: 12 });
    await page.mouse.up();

    await expect(dialog).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-023-settings-drag-selection.png'),
      fullPage: true,
    });
  });

  // REQ-023-AC-003
  test('selected theme applies and persists after reload', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Appearance' }).click();
    await dialog.getByRole('button', { name: /Ocean/ }).click();
    await dialog.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean', { timeout: 10_000 });

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-023-theme-ocean.png'),
      fullPage: true,
    });
  });

  // REQ-023-AC-005
  test('switching locale updates chrome labels and persists', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Language' }).click();
    await dialog.getByRole('button', { name: ZH.zhongwen }).click();
    // 草稿切到 zh 后 dialog accessible name 变为中文，改用通用 dialog 定位。
    const liveDialog = page.getByRole('dialog');
    await liveDialog.getByRole('button', { name: new RegExp('Save settings|' + ZH.save) }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await expect(page.getByRole('button', { name: ZH.settings, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: ZH.search, exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: ZH.settings, exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: ZH.search, exact: true })).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-023-locale-zh.png'),
      fullPage: true,
    });
  });
});
