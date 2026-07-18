import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode } from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

async function openSpotlight(page: import('@playwright/test').Page) {
  await page.locator('body').click();
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
  });
  await expect(page.getByRole('dialog', { name: 'Spotlight' })).toBeVisible();
}

test.describe('语义搜索', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const go = ((window as unknown as { go?: Record<string, unknown> }).go ??= {});
      (go as { ai?: unknown }).ai = {
        Service: {
          // 返回空重排结果，验证不注入公网推荐。
          RerankSemanticSearch: async () => ({ results: [] }),
        },
      };
    });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-018-AC-003：无匹配结果时显示空状态，不推荐公网 URL。
  test('语义搜索 shall 无匹配时显示空状态且不推荐外部 URL', async ({ page }) => {
    await openSpotlight(page);
    await page.getByRole('button', { name: 'Semantic' }).click();
    await page.getByLabel('Spotlight search').fill('color palette inspiration');

    const empty = page.locator('[data-spotlight-empty]');
    await expect(empty).toContainText(/No matching bookmarks in your library/i);
    await expect(empty).toContainText(/No external recommendations/i);
    await expect(page.getByRole('dialog', { name: 'Spotlight' }).getByRole('option')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Spotlight' }).locator('a[href^="http"]')).toHaveCount(0);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-034-semantic-empty.png'),
      fullPage: true,
    });
  });
});

test.describe('关键词降级', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const go = ((window as unknown as { go?: Record<string, unknown> }).go ??= {});
      (go as { ai?: unknown }).ai = {
        Service: {
          RerankSemanticSearch: async () => {
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

  // REQ-018-AC-002：AI 失败时英文降级并回退关键词，不伪造语义分。
  test('关键词降级 shall 在 AI 失败时显示英文提示并回退关键词结果', async ({ page }) => {
    await openSpotlight(page);
    await page.getByRole('button', { name: 'Semantic' }).click();
    await page.getByLabel('Spotlight search').fill('Coolors');

    await expect(page.getByRole('alert')).toContainText(/API Key is not configured|keyword results|fabricated semantic score/i);
    await expect(page.getByRole('option', { name: /Coolors/i }).first()).toBeVisible();
    await expect(page.getByText('%')).toHaveCount(0);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-034-keyword-fallback.png'),
      fullPage: true,
    });
  });
});
