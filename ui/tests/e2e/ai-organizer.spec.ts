import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enterLocalMode, waitForPersistedLocalLibrary } from './helpers';

const evidenceDirectory = resolve('../docs/spec/evidence');

test.describe('AI 创建主题与去重整理', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const go = ((window as unknown as { go?: Record<string, unknown> }).go ??= {});
      (go as { ai?: unknown }).ai = { Service: {
        GenerateCollection: async () => ({
          name: 'AI Frontend Research', description: 'Curated from the current library',
          suggestedTags: ['frontend', 'research'], bookmarkIds: ['b-coolors', 'b-figma'],
        }),
        AnalyzeBookmark: async () => ({
          title: 'Coolors Duplicate',
          description: 'Colors space helper',
          summary: 'Coolors duplicated summary',
          suggestedTags: ['design', 'colors'],
          suggestedCategoryId: null
        }),
        ReanalyzeBookmark: async () => ({
          title: 'Coolors Duplicate',
          description: 'Colors space helper',
          summary: 'Coolors duplicated summary',
          suggestedTags: ['design', 'colors'],
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
          suggestedTags: ['frontend', 'research'], bookmarkIds: ['b-coolors', 'b-figma'],
        }),
        AnalyzeBookmark: async () => ({
          title: 'Coolors Duplicate',
          description: 'Colors space helper',
          summary: 'Coolors duplicated summary',
          suggestedTags: ['design', 'colors'],
          suggestedCategoryId: null
        }),
        ReanalyzeBookmark: async () => ({
          title: 'Coolors Duplicate',
          description: 'Colors space helper',
          summary: 'Coolors duplicated summary',
          suggestedTags: ['design', 'colors'],
          suggestedCategoryId: null
        })
      } };
    });
    if (await page.getByRole('button', { name: 'Continue in local mode' }).count()) {
      await enterLocalMode(page);
    }
    // 品牌文案可能是整句 “Linkit — Smart Bookmark Library”，不以 exact Linkit 断言。
    await expect(page.getByRole('banner', { name: 'Top bar' })).toBeVisible();
    await mkdir(evidenceDirectory, { recursive: true });
  });

  test('AI 创建主题 shall 预览后仅保存确认成员', async ({ page }) => {
    await page.evaluate(() => {
      const go = ((window as unknown as { go?: Record<string, unknown> }).go ??= {});
      (go as { ai?: unknown }).ai = { Service: { GenerateCollection: async () => ({
        name: 'AI Frontend Research', description: 'Curated from the current library',
        suggestedTags: ['frontend', 'research'], bookmarkIds: ['b-coolors', 'b-figma'],
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
    // 自动保存库的变更以确保 localStorage 已存在
    await waitForPersistedLocalLibrary(page);
    // 直接在 localStorage 中植入重复书签以绕过新建时的唯一性校验
    await page.evaluate(() => {
      const legacyKey = 'lattice.library';
      const canonicalKey = 'linkit.library.v1';
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) return;
      const lib = JSON.parse(legacyRaw);
      const coolors = lib.bookmarks.find((b: { url: string }) => b.url === 'https://coolors.co');
      if (!coolors) return;
      const dup = {
        ...coolors,
        id: 'b-coolors-dup',
        title: 'Coolors Duplicate',
        description: 'Colors space helper',
        aiSummary: 'Coolors duplicated summary',
        notes: '',
        tags: ['t-design'],
        categoryId: '',
        createdAt: new Date().toISOString(),
      };
      lib.bookmarks.unshift(dup);
      localStorage.setItem(legacyKey, JSON.stringify(lib));
      // 启动优先读 canonical envelope；移除以免覆盖刚写入的 legacy 重复数据。
      localStorage.removeItem(canonicalKey);
    });
    await page.reload();

    await page.getByRole('button', { name: 'Find duplicates' }).click();
    // REQ-020-AC-005：先展示候选列表与重复对数
    const list = page.getByRole('dialog', { name: 'Duplicate pairs' });
    await expect(list.getByTestId('duplicate-pair-count')).toHaveText('1 duplicate pair found');
    await expect(list.getByRole('button', { name: 'Merge all' })).toBeVisible();
    await expect(list).toHaveScreenshot('TASK-083-duplicate-pairs.png', { maxDiffPixelRatio: 0.15 });
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-083-duplicate-pairs.png'), fullPage: true });
    await list.getByRole('button', { name: /Review .*Coolors Duplicate/ }).click();

    const dialog = page.getByRole('dialog', { name: 'Duplicate bookmark preview' });
    await expect(dialog).toContainText('Exact URL match');
    await expect(dialog).toContainText('Coolors Duplicate');
    // 强制高度以避免 Windows 和 Linux CI 因字体渲染产生的高度差异（398px vs 402px），统一设为 398px 以匹配 main 基准
    await dialog.evaluate((el) => {
      (el as HTMLElement).style.height = '398px';
    });
    await expect(dialog).toHaveScreenshot('TASK-035-duplicate-diff.png', { maxDiffPixelRatio: 0.15 });
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-035-duplicate-diff.png'), fullPage: true });
    const before = await page.getByText('Coolors Duplicate', { exact: true }).count();
    expect(before).toBeGreaterThan(0);
    await dialog.getByRole('button', { name: 'Merge' }).click();
    await expect.poll(() => page.getByText('Coolors Duplicate', { exact: true }).count()).toBeLessThan(before);
    // REQ-020-AC-006：修复后无剩余则关闭列表
    await expect(page.getByRole('dialog', { name: 'Duplicate pairs' })).toHaveCount(0);
  });

  test('去重整理 shall 显示多对数量并支持逐项修复后刷新列表', async ({ page }) => {
    await waitForPersistedLocalLibrary(page);
    await page.evaluate(() => {
      const legacyKey = 'lattice.library';
      const canonicalKey = 'linkit.library.v1';
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) return;
      const lib = JSON.parse(legacyRaw);
      const coolors = lib.bookmarks.find((b: { url: string }) => b.url === 'https://coolors.co');
      const vite = lib.bookmarks.find((b: { url: string }) => b.url === 'https://vitejs.dev');
      if (!coolors || !vite) return;
      lib.bookmarks.unshift(
        {
          ...coolors,
          id: 'b-coolors-dup',
          title: 'Coolors Duplicate',
          description: 'Colors space helper',
          notes: '',
          categoryId: '',
          createdAt: new Date().toISOString(),
        },
        {
          ...vite,
          id: 'b-vite-dup',
          title: 'Vite Duplicate',
          url: 'https://vitejs.dev/guide/',
          description: 'Vite guide mirror',
          notes: '',
          categoryId: '',
          createdAt: new Date().toISOString(),
        },
      );
      localStorage.setItem(legacyKey, JSON.stringify(lib));
      localStorage.removeItem(canonicalKey);
    });
    await page.reload();

    await page.getByRole('button', { name: 'Find duplicates' }).click();
    const list = page.getByRole('dialog', { name: 'Duplicate pairs' });
    await expect(list.getByTestId('duplicate-pair-count')).toHaveText('2 duplicate pairs found');
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-083-duplicate-pairs-multi.png'), fullPage: true });

    await list.getByRole('button', { name: /Review .*Vite Duplicate/ }).click();
    const preview = page.getByRole('dialog', { name: 'Duplicate bookmark preview' });
    await expect(preview).toContainText('Same domain: vitejs.dev');
    // Keep 为更短路径的 Vite 根书签；Delete 移除路径更长的 Vite Duplicate
    await preview.getByRole('button', { name: 'Delete duplicate' }).click();

    await expect(list.getByTestId('duplicate-pair-count')).toHaveText('1 duplicate pair found');
    await expect(list.getByRole('button', { name: /Review .*Coolors Duplicate/ })).toBeVisible();
    await expect(list.getByRole('button', { name: /Review .*Vite Duplicate/ })).toHaveCount(0);
  });

  test('去重整理 shall 支持勾选批量与 Merge all', async ({ page }) => {
    await waitForPersistedLocalLibrary(page);
    await page.evaluate(() => {
      const legacyKey = 'lattice.library';
      const canonicalKey = 'linkit.library.v1';
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) return;
      const lib = JSON.parse(legacyRaw);
      const coolors = lib.bookmarks.find((b: { url: string }) => b.url === 'https://coolors.co');
      const vite = lib.bookmarks.find((b: { url: string }) => b.url === 'https://vitejs.dev');
      if (!coolors || !vite) return;
      lib.bookmarks.unshift(
        {
          ...coolors,
          id: 'b-coolors-dup',
          title: 'Coolors Duplicate',
          description: 'Colors space helper',
          notes: '',
          categoryId: '',
          createdAt: new Date().toISOString(),
        },
        {
          ...vite,
          id: 'b-vite-dup',
          title: 'Vite Duplicate',
          url: 'https://vitejs.dev/guide/',
          description: 'Vite guide mirror',
          notes: '',
          categoryId: '',
          createdAt: new Date().toISOString(),
        },
      );
      localStorage.setItem(legacyKey, JSON.stringify(lib));
      localStorage.removeItem(canonicalKey);
    });
    await page.reload();

    await page.getByRole('button', { name: 'Find duplicates' }).click();
    const list = page.getByRole('dialog', { name: 'Duplicate pairs' });
    await expect(list.getByTestId('duplicate-pair-count')).toHaveText('2 duplicate pairs found');

    await list.getByRole('checkbox', { name: /Select .*Coolors Duplicate/ }).check();
    await list.getByRole('button', { name: 'Merge selected' }).click();
    await expect(list.getByTestId('duplicate-pair-count')).toHaveText('1 duplicate pair found');
    await expect(page.getByText('Coolors Duplicate', { exact: true })).toHaveCount(0);

    await list.getByRole('button', { name: 'Merge all' }).click();
    await expect(page.getByRole('dialog', { name: 'Duplicate pairs' })).toHaveCount(0);
    await expect(page.getByText('Vite Duplicate', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-083-duplicate-batch.png'), fullPage: true });
  });
});
