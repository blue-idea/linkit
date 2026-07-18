import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, expectLoginGate } from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

async function openStorageTab(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await settings.getByRole('tab', { name: 'Storage' }).click();
  return settings;
}

test.describe('存储切换与云冲突', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
  });

  // REQ-004-AC-001 / REQ-004-AC-004
  test('存储切换 shall 显示摘要并 Cancel 无副作用', async ({ page }) => {
    await enterLocalMode(page);
    await expect(page.getByLabel('Top bar').getByText('Local storage')).toBeVisible();

    const settings = await openStorageTab(page);
    await settings.getByText('Cloud storage', { exact: true }).click();

    const switchDialog = page.getByRole('dialog', { name: 'Switch storage mode?' });
    await expect(switchDialog).toBeVisible();
    await expect(switchDialog.getByTestId('storage-switch-source')).toBeVisible();
    await expect(switchDialog.getByTestId('storage-switch-target')).toBeVisible();
    await expect(switchDialog.getByRole('button', { name: 'Use Target' })).toBeVisible();
    await expect(switchDialog.getByRole('button', { name: 'Overwrite Target' })).toBeVisible();
    await expect(switchDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-029-storage-switch.png'),
      fullPage: true,
    });

    await switchDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(switchDialog).toHaveCount(0);
    // 草稿未改模式：设置内仍显示 Local 选中，保存后徽章不变。
    await expect(settings.getByText('Local storage', { exact: true })).toBeVisible();
    await settings.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByLabel('Top bar').getByText('Local storage')).toBeVisible();
  });

  // REQ-004-AC-002
  test('存储切换 shall 在 Use Target 后切换到云模式徽章', async ({ page }) => {
    await enterLocalMode(page);
    const settings = await openStorageTab(page);
    await settings.getByText('Cloud storage', { exact: true }).click();
    const switchDialog = page.getByRole('dialog', { name: 'Switch storage mode?' });
    await switchDialog.getByRole('button', { name: 'Use Target' }).click();
    await settings.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByLabel('Top bar').getByText('Cloud storage')).toBeVisible();
  });

  // REQ-003-AC-005
  test('云冲突 shall 显示 Use Cloud Copy、Overwrite Cloud 与 Cancel', async ({ page }) => {
    await page.goto('/?e2eCloudConflict=1&e2eCloudRevision=9');
    await page.evaluate(() => localStorage.clear());
    // 保留 query；仅清存储后重新进入。
    await page.goto('/?e2eCloudConflict=1&e2eCloudRevision=9');
    await expectLoginGate(page);
    await enterLocalMode(page);

    const conflict = page.getByRole('dialog', { name: 'Cloud revision conflict' });
    await expect(conflict).toBeVisible({ timeout: 15_000 });
    await expect(conflict.getByRole('button', { name: 'Use Cloud Copy' })).toBeVisible();
    await expect(conflict.getByRole('button', { name: 'Overwrite Cloud' })).toBeVisible();
    await expect(conflict.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(conflict.getByTestId('cloud-conflict-revision')).toContainText('9');

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-029-cloud-conflict.png'),
      fullPage: true,
    });

    await conflict.getByRole('button', { name: 'Cancel' }).click();
    await expect(conflict).toHaveCount(0);
    // Cancel 后本机库仍在（徽章仍可见）。
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible();
  });

  // dirty cloud draft 启动恢复
  test('云草稿恢复 shall 显示 Keep Draft 与 Discard Draft', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'linkit.cloud-draft.v1',
        JSON.stringify({
          format: 'linkit-cloud-draft',
          schemaVersion: 1,
          baseRevision: 2,
          cloudRevision: 5,
          dirty: true,
          updatedAt: '2026-07-18T12:00:00.000Z',
          data: { bookmarks: [], categories: [], collections: [], tags: [] },
        })
      );
    });
    await page.reload();
    await expectLoginGate(page);
    await enterLocalMode(page);

    const recovery = page.getByRole('dialog', { name: 'Unsynced cloud draft found' });
    await expect(recovery).toBeVisible({ timeout: 15_000 });
    await expect(recovery.getByRole('button', { name: 'Keep Draft' })).toBeVisible();
    await expect(recovery.getByRole('button', { name: 'Discard Draft' })).toBeVisible();
    await expect(recovery.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(recovery.getByTestId('cloud-draft-revisions')).toContainText('2');

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-029-cloud-draft-recovery.png'),
      fullPage: true,
    });

    await recovery.getByRole('button', { name: 'Cancel' }).click();
    await expect(recovery).toHaveCount(0);
    await expect(page.getByLabel('Top bar').getByText('Local storage')).toBeVisible();
  });
});
