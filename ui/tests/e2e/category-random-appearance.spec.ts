import { expect, test } from '@playwright/test';
import {
  CATEGORY_COLOR_CANDIDATES,
  CATEGORY_ICON_CANDIDATES,
} from '../../src/config/category-icons';
import { enterLocalMode } from './helpers';

const localLibraryKey = 'lattice.library';
const fixedRandomValue = 0.5;
const expectedIcon = CATEGORY_ICON_CANDIDATES[
  Math.floor(CATEGORY_ICON_CANDIDATES.length * fixedRandomValue)
];
const expectedColor = CATEGORY_COLOR_CANDIDATES[
  Math.floor(CATEGORY_COLOR_CANDIDATES.length * fixedRandomValue)
];

async function readSavedCategoryAppearance(
  page: import('@playwright/test').Page,
  name: string
): Promise<{ icon: string; color: string } | null> {
  return page.evaluate(({ key, categoryName }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const library = JSON.parse(raw) as {
      categories?: Array<{ name?: string; icon?: string; color?: string }>;
    };
    const category = library.categories?.find((item) => item.name === categoryName);
    return category?.icon && category.color
      ? { icon: category.icon, color: category.color }
      : null;
  }, { key: localLibraryKey, categoryName: name });
}

test.describe('新建分类随机外观', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterLocalMode(page);
  });

  test('侧栏新建分类时随机生成并保存图标与颜色', async ({ page }, testInfo) => {
    const categoryName = 'Random Appearance Category';
    await page.evaluate((value) => {
      Math.random = () => value;
    }, fixedRandomValue);

    await page.getByRole('button', { name: 'New category' }).click();
    await page.getByLabel('Category name').fill(categoryName);
    await page.getByRole('button', { name: 'Create category' }).click();

    const row = page.locator(`[data-category-drop="${categoryName}"]`);
    await expect(row).toBeVisible();
    await expect.poll(() => readSavedCategoryAppearance(page, categoryName)).toEqual({
      icon: expectedIcon,
      color: expectedColor,
    });
    await expect(row.locator('svg.lucide-sparkles')).toHaveClass(/text-coral-400/);

    await page.screenshot({
      path: testInfo.outputPath('category-random-appearance-actual.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await expect(page).toHaveScreenshot('category-random-appearance-baseline.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.08,
    });
  });
});
