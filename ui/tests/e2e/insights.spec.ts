import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enterLocalMode } from './helpers';

const evidenceDirectory = resolve('../docs/spec/evidence');

test.describe('Insights', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterLocalMode(page);
    await mkdir(evidenceDirectory, { recursive: true });
  });

  test('Insights shall 显示可追溯指标并跳转到相关视图', async ({ page }) => {
    await page.getByText('Insights', { exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Insights report' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Evidence:/).first()).toBeAttached();
    const action = dialog.getByRole('button', { name: /View |Open / }).first();
    await expect(action).toBeVisible();
    const target = await action.getAttribute('data-action-type');
    await action.click();
    await expect(dialog).toHaveCount(0);
    if (target === 'health-filter') {
      // ContentArea 使用领域状态展示文案 Changed / Broken。
      await expect(page.getByRole('heading', { name: /Changed|Broken/ })).toBeAttached();
    } else {
      await expect(page.getByRole('main', { name: 'Content Area' })).toBeVisible();
    }
    await page.getByText('Insights', { exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Insights report' }))
      .toHaveScreenshot('TASK-038-insights-report.png', { maxDiffPixelRatio: 0.05 });
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-038-insights-report.png'), fullPage: true });
  });
});
