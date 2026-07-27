import { expect, test } from '@playwright/test';
import { enterLocalMode, expectLoginGate } from './helpers';

test.describe('Settings AI 接口连通性', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const target = window as unknown as {
        go?: Record<string, unknown>;
        __connectionCalls?: number;
      };
      target.__connectionCalls = 0;
      target.go = {
        ai: {
          Service: {
            TestConnection: async () => {
              target.__connectionCalls = (target.__connectionCalls ?? 0) + 1;
              return {
                status: 'ok',
                latencyMs: 42,
                testedAt: '2026-07-27T09:00:00.000Z',
              };
            },
          },
        },
      };
    });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectLoginGate(page);
    await enterLocalMode(page);
  });

  test('REQ-033-AC-001 完整配置显示连接耗时和测试时间', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'AI' }).click();
    await dialog.getByPlaceholder('https://api.openai.com/v1').fill('https://api.example.test/v1');
    await dialog.getByPlaceholder('gpt-4o-mini').fill('test-model');
    await dialog.getByLabel('API Key').fill('sk-e2e-placeholder');
    await dialog.getByRole('button', { name: 'Test connection' }).click();

    await expect(dialog.getByText('Connected in 42 ms')).toBeVisible();
    await expect(dialog.getByText('Tested at 2026-07-27T09:00:00.000Z')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __connectionCalls?: number }).__connectionCalls)).toBe(1);
  });

  test('REQ-033-AC-002 配置缺失时不建立请求', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'AI' }).click();
    await expect(dialog.getByRole('button', { name: 'Test connection' })).toBeDisabled();
    await expect(dialog.getByText('Complete API Base, Model, and API Key before testing.')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __connectionCalls?: number }).__connectionCalls)).toBe(0);
  });

  test('REQ-033-AC-003 未授权错误保持设置与资料库不变', async ({ page }) => {
    await page.evaluate(() => {
      const target = window as unknown as {
        go?: { ai?: { Service?: { TestConnection?: () => Promise<unknown> } } };
      };
      if (target.go?.ai?.Service) {
        target.go.ai.Service.TestConnection = async () => {
          throw 'AI service rejected the API key';
        };
      }
    });
    const libraryBefore = await page.evaluate(() => localStorage.getItem('lattice.library'));
    const settingsBefore = await page.evaluate(() => localStorage.getItem('linkit.settings.v1'));

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'AI' }).click();
    await dialog.getByPlaceholder('https://api.openai.com/v1').fill('https://api.example.test/v1');
    await dialog.getByPlaceholder('gpt-4o-mini').fill('test-model');
    await dialog.getByLabel('API Key').fill('sk-e2e-placeholder');
    await dialog.getByRole('button', { name: 'Test connection' }).click();

    await expect(dialog.getByRole('alert')).toHaveText('Connection failed: the API key was rejected.');
    expect(await page.evaluate(() => localStorage.getItem('lattice.library'))).toBe(libraryBefore);
    expect(await page.evaluate(() => localStorage.getItem('linkit.settings.v1'))).toBe(settingsBefore);
  });
});
