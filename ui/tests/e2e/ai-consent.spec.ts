import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, expectLoginGate } from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

test.describe('AI 设置与授权', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
  });

  // REQ-019-AC-001 / REQ-025-AC-002：Key 不进入设置草稿明文持久化路径。
  test('AI 设置 shall 保存本机配置且不在界面回显 Key 明文', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('tab', { name: 'AI' }).click();

    await settings.getByPlaceholder('https://api.openai.com/v1').fill('https://api.example.test/v1');
    await settings.getByPlaceholder('gpt-4o-mini').fill('test-model');
    await settings.getByLabel('API Key').fill('sk-e2e-secret-key');

    // 保存前应弹出授权说明。
    await settings.getByRole('button', { name: 'Save settings' }).click();
    const consent = page.getByRole('dialog', { name: 'Allow sending bookmark data?' });
    await expect(consent).toBeVisible();
    await expect(consent.getByTestId('ai-consent-api-base')).toContainText('https://api.example.test/v1');

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-031-ai-consent.png'),
      fullPage: true,
    });

    await consent.getByRole('button', { name: 'Allow and continue' }).click();
    await expect(consent).toHaveCount(0);

    // 重新打开设置：Key 输入框应为空（不回显明文），状态为已配置。
    await page.getByRole('button', { name: 'Settings' }).click();
    const again = page.getByRole('dialog', { name: 'Settings' });
    await again.getByRole('tab', { name: 'AI' }).click();
    await expect(again.getByLabel('API Key')).toHaveValue('');
    await expect(again.getByTestId('ai-key-status')).toContainText('configured');
  });

  // REQ-019-AC-005
  test('AI 授权 shall Cancel 时不保存设置', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('tab', { name: 'AI' }).click();
    await settings.getByPlaceholder('https://api.openai.com/v1').fill('https://api.example.test/v1');
    await settings.getByRole('button', { name: 'Save settings' }).click();

    const consent = page.getByRole('dialog', { name: 'Allow sending bookmark data?' });
    await consent.getByRole('button', { name: 'Cancel' }).click();
    await expect(consent).toHaveCount(0);
    // Settings 仍打开，尚未关闭。
    await expect(settings).toBeVisible();
  });
});
