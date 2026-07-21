import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, expectLoginGate } from '../e2e/helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence',
);

test.describe('Settings save feedback', () => {
  test('保存失败时显示错误反馈并保持对话框', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expectLoginGate(page);
    await enterLocalMode(page);

    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItem(key: string, value: string) {
        if (key === 'linkit.settings.v1') {
          throw new Error('Simulated settings write failure');
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('button', { name: 'Save settings' }).click();

    await expect(dialog.getByRole('alert')).toHaveText('Unable to save settings.');
    await expect(dialog).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await dialog.screenshot({
      path: resolve(evidenceDirectory, 'TASK-066-settings-save-error-actual.png'),
    });
    await expect(dialog).toHaveScreenshot('TASK-066-settings-save-error-baseline.png', {
      animations: 'disabled',
    });
  });
});
