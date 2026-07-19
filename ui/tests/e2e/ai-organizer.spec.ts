import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enterLocalMode } from './helpers';

const evidenceDirectory = resolve('../docs/spec/evidence');

test.describe('AI 创建主题与去重整理', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const go = ((window as unknown as { go?: Record<string, unknown> }).go ??= {});
      (go as { ai?: unknown }).ai = { Service: {
        GenerateCollection: async () => ({
          name: 'AI Frontend Research', description: 'Curated from the current library',
          suggestedTags: ['frontend', 'research'], bookmarkIds: ['b-coolors', 'b-fontpair'],
        }),
        AnalyzeBookmark: async (req: { title?: string; description?: string }) => ({
          title: req.title || 'Mock Title',
          description: req.description || 'Mock Description',
          summary: 'Mock Summary',
          suggestedTags: ['mock-tag'],
          suggestedCategoryId: null
        }),
        ReanalyzeBookmark: async (req: { title?: string; description?: string }) => ({
          title: req.title || 'Mock Title',
          description: req.description || 'Mock Description',
          summary: 'Mock Summary',
          suggestedTags: ['mock-tag'],
          suggestedCategoryId: null
        })
      } };
    });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('linkit.settings.v1', JSON.stringify({
        settingsVersion: 1, storageMode: 'local', theme: 'midnight', locale: 'en',
        ai: { apiBase: 'https://api.example.test/v1', model: 'test-model' },
        aiConsent: null, view: { defaultMode: 'card' }, lastCloudRevision: null,
      }));
    });
    await page.reload();
    await page.evaluate(() => {
      const go = ((window as unknown as { go?: Record<string, unknown> }).go ??= {});
      (go as { ai?: unknown }).ai = { Service: {
        GenerateCollection: async () => ({
          name: 'AI Frontend Research', description: 'Curated from the current library',
          suggestedTags: ['frontend', 'research'], bookmarkIds: ['b-coolors', 'b-fontpair'],
        }),
        AnalyzeBookmark: async (req: { title?: string; description?: string }) => ({
          title: req.title || 'Mock Title',
          description: req.description || 'Mock Description',
          summary: 'Mock Summary',
          suggestedTags: ['mock-tag'],
          suggestedCategoryId: null
        }),
        ReanalyzeBookmark: async (req: { title?: string; description?: string }) => ({
          title: req.title || 'Mock Title',
          description: req.description || 'Mock Description',
          summary: 'Mock Summary',
          suggestedTags: ['mock-tag'],
          suggestedCategoryId: null
        })
      } };
    });
    if (await page.getByRole('button', { name: 'Continue in local mode' }).count()) {
      await enterLocalMode(page);
    } else {
      await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
    }
    await mkdir(evidenceDirectory, { recursive: true });
  });

  test('AI 创建主题 shall 预览后仅保存确认成员', async ({ page }) => {
    await page.evaluate(() => {
      const go = ((window as unknown as { go?: Record<string, unknown> }).go ??= {});
      (go as { ai?: unknown }).ai = { Service: { GenerateCollection: async () => ({
        name: 'AI Frontend Research', description: 'Curated from the current library',
        suggestedTags: ['frontend', 'research'], bookmarkIds: ['b-coolors', 'b-fontpair'],
      }) } };
    });
    await page.getByRole('button', { name: 'AI create collection' }).click();
    const goalDialog = page.getByRole('dialog', { name: 'AI create collection' });
    await expect(goalDialog).toBeVisible();
    await expect(goalDialog).toContainText('Describe the collection you want');
    await expect(goalDialog).toHaveScreenshot('TASK-035-ai-collection-goal.png', { maxDiffPixelRatio: 0.05 });
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-035-ai-collection-goal.png'), fullPage: true });
    await goalDialog.getByLabel('Collection goal').fill('Build a frontend research collection');
    await goalDialog.getByRole('button', { name: 'Generate preview' }).click();
    const dialog = page.getByRole('dialog', { name: 'AI collection preview' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Nothing has been changed yet');
    await expect(dialog).toHaveScreenshot('TASK-035-ai-collection-preview.png', { maxDiffPixelRatio: 0.05 });
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-035-ai-collection-preview.png'), fullPage: true });
    await dialog.getByLabel('Collection name').fill('TASK035 Confirmed Collection');
    await dialog.getByRole('checkbox').nth(1).uncheck();
    await dialog.getByRole('button', { name: 'Create collection' }).click();
    await expect(page.getByText('TASK035 Confirmed Collection', { exact: true }).first()).toBeVisible();
  });

  test('去重整理 shall 展示字段差异且确认前零副作用', async ({ page }) => {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await page.getByRole('textbox', { name: 'Bookmark URL' }).fill('https://coolors.co');
    await page.getByLabel('Bookmark title hint').fill('Coolors Duplicate');
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save bookmark' })).toBeVisible();
    await page.getByRole('button', { name: 'Save bookmark' }).click();

    await page.getByRole('button', { name: 'Find duplicates' }).click();
    const dialog = page.getByRole('dialog', { name: 'Duplicate bookmark preview' });
    await expect(dialog).toContainText('Exact URL match');
    await expect(dialog).toContainText('Coolors Duplicate');
    await expect(dialog).toHaveScreenshot('TASK-035-duplicate-diff.png', { maxDiffPixelRatio: 0.05 });
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-035-duplicate-diff.png'), fullPage: true });
    const before = await page.getByText('Coolors Duplicate', { exact: true }).count();
    expect(before).toBeGreaterThan(0);
    await dialog.getByRole('button', { name: 'Merge' }).click();
    await expect.poll(() => page.getByText('Coolors Duplicate', { exact: true }).count()).toBeLessThan(before);
  });
});
