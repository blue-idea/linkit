import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, expectLoginGate } from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

test.describe('Storage data root', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
  });

  // REQ-029-AC-001 / REQ-023-AC-002：Settings → Storage 显示数据目录并可发起更改。
  test('storage section shows data location and confirms migration', async ({ page }) => {
    await enterLocalMode(page);
    await page.evaluate(() => {
      (window as unknown as { __linkitSelectDirectory: () => string }).__linkitSelectDirectory = () =>
        'D:\\LinkitMigrated';
    });

    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('tab', { name: 'Storage' }).click();

    const location = dialog.getByTestId('storage-data-location');
    await expect(location).toBeVisible();
    await expect(dialog.getByTestId('storage-data-root-path')).toContainText('browser://linkit');

    await dialog.getByRole('button', { name: 'Change folder' }).click();
    const confirm = dialog.getByTestId('storage-data-root-confirm');
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText('D:\\LinkitMigrated');
    await confirm.getByRole('button', { name: 'Confirm' }).click();

    await expect(dialog.getByTestId('storage-data-root-path')).toContainText('D:\\LinkitMigrated');
    await expect(dialog.getByText('Data location updated')).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-047-data-root-settings.png'),
      fullPage: true,
    });
  });

  // REQ-029-AC-003：目标占用时英文错误并保持原路径。
  test('occupied target blocks migration', async ({ page }) => {
    await enterLocalMode(page);
    await page.evaluate(() => {
      localStorage.setItem('linkit.data-root.occupied:D:\\Occupied', '1');
      (window as unknown as { __linkitSelectDirectory: () => string }).__linkitSelectDirectory = () =>
        'D:\\Occupied';
    });

    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Storage' }).click();
    await dialog.getByRole('button', { name: 'Change folder' }).click();
    await dialog.getByTestId('storage-data-root-confirm').getByRole('button', { name: 'Confirm' }).click();

    await expect(dialog.getByTestId('storage-data-root-error')).toContainText(
      'Target directory already contains Linkit data'
    );
    await expect(dialog.getByTestId('storage-data-root-path')).toContainText('browser://linkit');
  });
});
