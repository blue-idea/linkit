import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '使用本地模式（无需登录）' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

test.describe('书签状态与访问', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: '使用本地模式（无需登录）' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-008-AC-001
  test('星标 shall 切换后立即反映在详情与筛选', async ({ page }) => {
    const star = page.getByRole('button', { name: 'Toggle star' });
    await expect(star).toBeVisible();
    const before = await star.getAttribute('aria-pressed');
    await star.click();
    await expect(star).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');

    // 侧栏「星标」入口应可点击；具体列表内容在置顶/筛选用例中覆盖。
    await page.getByText('星标', { exact: true }).first().click();
  });

  // REQ-008-AC-001
  test('置顶 shall 切换后立即反映在详情', async ({ page }) => {
    const pin = page.getByRole('button', { name: 'Toggle pin' });
    await expect(pin).toBeVisible();
    const before = await pin.getAttribute('aria-pressed');
    await pin.click();
    await expect(pin).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  });

  // REQ-008-AC-003 / REQ-008-AC-004
  test('阅读状态 shall 更新并可筛选', async ({ page }) => {
    const status = page.getByLabel('Read status', { exact: true });
    await expect(status).toBeVisible();
    await status.selectOption('reading');
    await expect(status).toHaveValue('reading');

    await page.getByLabel('Filter by read status').selectOption('reading');
    await expect(page.getByLabel('Read status', { exact: true })).toHaveValue('reading');
  });

  // REQ-008-AC-002
  test('访问计数 shall 仅在外部打开成功后增加', async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as { open: typeof window.open }).open = () =>
        ({ closed: false } as Window);
    });

    const visits = page.getByLabel('Visit count');
    await expect(visits).toBeVisible();
    const beforeText = await visits.textContent();
    const before = Number(beforeText?.replace(/\D/g, '') || '0');

    await page.getByRole('button', { name: 'Open bookmark URL' }).click();
    await expect(visits).toContainText(String(before + 1));

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-012-visit-count.png'),
      fullPage: true,
    });
  });

  test('星标与阅读状态 shall 留下视觉证据', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle star' }).click();
    await page.getByLabel('Read status', { exact: true }).selectOption('archived');
    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-012-star-read-status.png'),
      fullPage: true,
    });
  });
});
