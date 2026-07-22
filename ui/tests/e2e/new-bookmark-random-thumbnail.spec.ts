import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode } from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

const localLibraryKey = 'lattice.library';

async function readSavedThumbnail(
  page: import('@playwright/test').Page,
  title: string
): Promise<string | null> {
  return page.evaluate(({ key, bookmarkTitle }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const library = JSON.parse(raw) as {
      bookmarks?: Array<{ title?: string; thumbnail?: string | null }>;
    };
    return library.bookmarks?.find((bookmark) => bookmark.title === bookmarkTitle)?.thumbnail ?? null;
  }, { key: localLibraryKey, bookmarkTitle: title });
}

test.describe('TASK-073 新建书签随机渐变缩略图', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterLocalMode(page);
  });

  // fix_task 1.15 / REQ-006-AC-010
  test('确认保存 shall 持久化随机渐变键并在详情中显示', async ({ page }) => {
    const title = 'Random Gradient Bookmark';
    await page.evaluate(() => {
      Math.random = () => 0.75;
    });

    await page.getByRole('button', { name: 'New', exact: true }).click();
    await page.getByRole('textbox', { name: 'Bookmark URL' }).fill('https://example.test/random-gradient');
    await page.getByLabel('Bookmark title hint').fill(title);
    await page.getByRole('button', { name: 'Manual', exact: true }).click();
    await page.getByRole('button', { name: 'Save bookmark' }).click();

    await expect(page.getByRole('main', { name: 'Content Area' }).getByText(title)).toBeVisible();
    await expect.poll(() => readSavedThumbnail(page, title)).not.toBeNull();
    expect(await readSavedThumbnail(page, title)).toBe('violet');
    await expect(
      page
        .getByRole('complementary', { name: 'Detail Panel' })
        .locator('[class~="from-violet2-500"][class~="via-violet2-400"][class~="to-accent-500"]')
    ).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-073-random-thumbnail-actual.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await expect(page).toHaveScreenshot('TASK-073-random-thumbnail-baseline.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.08,
    });
  });
});
