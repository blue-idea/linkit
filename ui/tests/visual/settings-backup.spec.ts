import { expect, test } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, expectLoginGate } from '../e2e/helpers';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = resolve(testDirectory, '../../../docs/spec/evidence');
const snapshotDirectory = resolve(testDirectory, 'settings-backup.spec.ts-snapshots');
const fixturesDirectory = resolve(testDirectory, '../fixtures');

async function prepare(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expectLoginGate(page);
  await enterLocalMode(page);
}

async function openGeneralSettings(page: import('@playwright/test').Page, settingsLabel: string, generalLabel: string) {
  await page.getByRole('button', { name: settingsLabel, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: generalLabel }).click();
  return dialog;
}

async function saveDialogEvidence(
  dialog: import('@playwright/test').Locator,
  snapshotName: string,
  evidencePrefix: string,
) {
  await expect(dialog).toHaveScreenshot(snapshotName, {
    animations: 'disabled',
    maxDiffPixelRatio: 0.05,
  });
  await mkdir(evidenceDirectory, { recursive: true });
  await copyFile(resolve(snapshotDirectory, snapshotName), resolve(evidenceDirectory, `${evidencePrefix}-baseline.png`));
  await dialog.screenshot({
    path: resolve(evidenceDirectory, `${evidencePrefix}-actual.png`),
    animations: 'disabled',
  });
}

test.describe('TASK-078 Settings backup visual regression', () => {
  test('English backup overwrite dialog matches baseline', async ({ page }) => {
    await prepare(page);
    const dialog = await openGeneralSettings(page, 'Settings', 'General');
    await dialog.locator('[data-testid="import-file-input"]').setInputFiles(resolve(fixturesDirectory, 'valid-backup.json'));

    const confirm = page.getByRole('dialog', { name: 'Overwrite current library?' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByTestId('import-settings-details')).toContainText('ocean');
    await saveDialogEvidence(confirm, 'TASK-078-settings-backup-en.png', 'TASK-078-settings-backup-en');
  });

  test('中文导入覆盖摘要对话框匹配基线', async ({ page }) => {
    await prepare(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    let dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Language' }).click();
    await dialog.getByRole('button', { name: '中文' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '保存设置' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    dialog = await openGeneralSettings(page, '设置', '通用');
    await dialog.locator('[data-testid="import-file-input"]').setInputFiles(resolve(fixturesDirectory, 'valid-backup.json'));

    const confirm = page.getByRole('dialog', { name: '覆盖当前资料库？' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByTestId('import-settings-details')).toContainText('ocean');
    await saveDialogEvidence(confirm, 'TASK-078-settings-backup-zh.png', 'TASK-078-settings-backup-zh');
  });
});
