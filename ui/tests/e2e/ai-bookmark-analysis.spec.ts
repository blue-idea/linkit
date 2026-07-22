import { expect, test } from '@playwright/test';
import { enterLocalMode } from './helpers';

test.describe('AI 入库分析', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-006-AC-002 / REQ-006-AC-003：无真实 AI 绑定时英文降级，确认前不入库。
  test('AI 入库分析 shall 在服务不可用时英文降级且确认前不入库', async ({ page }) => {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'New Bookmark' })).toBeVisible();

    await page.getByRole('textbox', { name: 'Bookmark URL' }).fill('https://example.test/ai-inbound');
    await page.getByLabel('Bookmark title hint').fill('AI Inbound Bookmark');
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText(/AI analysis is unavailable|manual|Could not fetch/i);
    await expect(page.getByRole('button', { name: 'Save bookmark' })).toBeVisible();
    await expect(page.getByText('AI Inbound Bookmark').first()).toHaveCount(0);

    await page.getByRole('button', { name: 'Save bookmark' }).click();
    await expect(page.getByText('AI Inbound Bookmark').first()).toBeVisible();
  });

  // TASK-069 / REQ-006-AC-002 / REQ-014-AC-003：AI 建议应复用现有标签并随确认保存。
  test('AI 入库分析 shall 将格式等价建议映射为现有标签且不创建新标签', async ({ page }) => {
    await page.evaluate(() => {
      const go = ((window as unknown as { go?: Record<string, unknown> }).go ??= {});
      (go as { metadata?: unknown }).metadata = {
        Service: {
          FetchMetadata: async () => ({
            title: 'React Documentation',
            description: 'Official React documentation.',
            contentText: 'React components, hooks, and API reference.',
            faviconUrl: null,
            faviconDataUrl: null,
          }),
        },
      };
      (go as { ai?: unknown }).ai = {
        Service: {
          AnalyzeBookmark: async () => ({
            title: 'React Documentation',
            description: 'Official React documentation.',
            summary: 'React API reference and guides.',
            suggestedCategoryId: null,
            suggestedTags: ['# React'],
          }),
        },
      };
    });

    await page.getByRole('button', { name: 'New', exact: true }).click();
    await page.getByRole('textbox', { name: 'Bookmark URL' }).fill('https://react.dev/reference');
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await page.getByRole('button', { name: 'Save bookmark' }).click();

    const savedTag = page.getByRole('button', { name: 'Remove tag React' });
    await expect(savedTag).toBeVisible();
    await expect(page.getByText('# React', { exact: true })).toHaveCount(0);
    await savedTag.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '../docs/spec/evidence/TASK-069-ai-tag-match.png',
      fullPage: true,
    });
  });
});

test.describe('重新分析', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-020-AC-001：打开 Reanalyze 展示预览或错误，确认前不改摘要。
  test('重新分析 shall 打开预览对话框且失败时保留原摘要', async ({ page }) => {
    const title = await page.getByLabel('Edit bookmark title').first().textContent();
    expect(title).toBeTruthy();

    const summaryBefore = await page.locator('text=AI 摘要').count();
    await page.getByRole('button', { name: 'Regenerate AI summary' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reanalyze bookmark' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('alert')).toContainText(/AI|unavailable|Key|consent|manual/i);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(await page.locator('text=AI 摘要').count()).toBe(summaryBefore);
  });
});

test.describe('AI 降级', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const go = ((window as unknown as { go?: Record<string, unknown> }).go ??= {});
      (go as { ai?: unknown }).ai = {
        Service: {
          AnalyzeBookmark: async () => {
            throw { code: 'SECRET_NOT_CONFIGURED', message: 'AI API Key is not configured' };
          },
          ReanalyzeBookmark: async () => {
            throw { code: 'SECRET_NOT_CONFIGURED', message: 'AI API Key is not configured' };
          },
        },
      };
    });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-006-AC-003：无 Key 时英文降级，禁止伪 AI 摘要。
  test('AI 降级 shall 在无 Key 时显示英文提示且不注入伪摘要', async ({ page }) => {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await page.getByRole('textbox', { name: 'Bookmark URL' }).fill('https://example.test/ai-fallback');
    await page.getByLabel('Bookmark title hint').fill('Fallback Bookmark');
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText(/API Key is not configured|no simulated AI result/i);
    await expect(page.getByRole('textbox', { name: 'AI summary' })).toHaveValue('');
    await page.screenshot({
      path: '../docs/spec/evidence/TASK-033-ai-fallback.png',
      fullPage: true,
    });
  });
});
