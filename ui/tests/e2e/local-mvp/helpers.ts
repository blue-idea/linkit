import { expect, type Locator, type Page } from '@playwright/test';
import { enterLocalMode, expectLoginGate } from '../helpers';

export { enterLocalMode, expectLoginGate };

/** 主要操作计数器：不计入文本输入（REQ-028-AC-001~003）。 */
export class PrimaryActionCounter {
  private _count = 0;

  get count() {
    return this._count;
  }

  reset() {
    this._count = 0;
  }

  async click(target: Locator) {
    this._count += 1;
    await target.click();
  }

  async press(page: Page, key: string) {
    this._count += 1;
    await page.keyboard.press(key);
  }
}

export async function resetApp(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expectLoginGate(page);
}

export { openSpotlight } from '../helpers';

export async function openNewBookmark(page: Page, actions?: PrimaryActionCounter) {
  const button = page.getByRole('button', { name: 'New', exact: true });
  if (actions) {
    await actions.click(button);
  } else {
    await button.click();
  }
  await expect(page.getByRole('heading', { name: 'New Bookmark' })).toBeVisible();
}
