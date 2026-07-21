import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { enterLocalMode, expectLoginGate } from './helpers';

const evidenceDirectory = resolve(process.cwd(), '../docs/spec/evidence');

test.describe('Settings Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
  });

  // REQ-030-AC-006 / REQ-023-AC-001
  test('设置中列出 Shortcuts 分区与全部快捷键', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog.getByRole('tab', { name: 'Shortcuts' })).toBeVisible();
    await dialog.getByRole('tab', { name: 'Shortcuts' }).click();
    await expect(dialog.getByText('Spotlight search')).toBeVisible();
    await expect(dialog.getByText('Show / hide window')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Restore Defaults' })).toBeVisible();
    await dialog.screenshot({
      path: resolve(evidenceDirectory, 'TASK-059-shortcuts-panel.png'),
    });
  });
});
