import { expect, test } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, expectLoginGate } from '../e2e/helpers';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = resolve(testDirectory, '../../../docs/spec/evidence');
const snapshotDirectory = resolve(testDirectory, 'ui-language-alignment.spec.ts-snapshots');

async function prepare(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expectLoginGate(page);
  await enterLocalMode(page);
}

async function saveEvidence(
  page: import('@playwright/test').Page,
  snapshotName: string,
  evidencePrefix: string,
) {
  await expect(page).toHaveScreenshot(snapshotName, { fullPage: true, maxDiffPixelRatio: 0.08 });
  await mkdir(evidenceDirectory, { recursive: true });
  await copyFile(resolve(snapshotDirectory, snapshotName), resolve(evidenceDirectory, `${evidencePrefix}-baseline.png`));
  await page.screenshot({
    path: resolve(evidenceDirectory, `${evidencePrefix}-actual.png`),
    fullPage: true,
  });
}

test.describe('TASK-056 全界面语言视觉回归', () => {
  // REQ-023-AC-004 / REQ-023-AC-008
  test('[Visual] English 主界面 shall 匹配批准基线', async ({ page }) => {
    await prepare(page);
    await saveEvidence(page, 'TASK-056-en-main.png', 'TASK-056-en-main');
  });

  // REQ-023-AC-005 / REQ-023-AC-008
  test('[Visual] 中文主界面与新建对话框 shall 匹配批准基线', async ({ page }) => {
    await prepare(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('tab', { name: 'Language' }).click();
    await settings.getByRole('button', { name: '中文' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '保存设置' }).click();
    await page.getByRole('button', { name: '新增', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '新建书签' })).toBeVisible();
    await saveEvidence(page, 'TASK-056-zh-new-bookmark.png', 'TASK-056-zh-new-bookmark');
  });
});
