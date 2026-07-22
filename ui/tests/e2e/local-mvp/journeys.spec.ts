import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  enterLocalMode,
  openNewBookmark,
  openSpotlight,
  resetApp,
} from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../docs/spec/evidence'
);
const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

const views = [
  { name: 'Card view', attr: 'card' },
  { name: 'List view', attr: 'list' },
  { name: 'Masonry view', attr: 'masonry' },
  { name: 'Timeline view', attr: 'timeline' },
  { name: 'Tag Aggregation view', attr: 'tag-aggregation' },
  { name: 'Theme Space view', attr: 'theme-space' },
] as const;

test.describe('local MVP journeys', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
  });

  // REQ-002 / REQ-006~017 / REQ-023~024 / REQ-028
  test('local mode capture find organize views import export settings journey', async ({ page }) => {
    await enterLocalMode(page);
    await expect(page.getByRole('navigation', { name: 'Sidebar' })).toBeVisible();
    await expect(page.getByRole('main', { name: 'Content Area' })).toBeVisible();

    await openNewBookmark(page);
    await page.getByRole('textbox', { name: 'Bookmark URL' }).fill('https://example.test/mvp-journey');
    await page.getByLabel('Bookmark title hint').fill('MVP Journey Bookmark');
    await page.getByRole('button', { name: 'Smart' }).click();
    await page.getByRole('button', { name: 'Save bookmark' }).click();
    await expect(page.getByRole('main', { name: 'Content Area' }).getByText('MVP Journey Bookmark')).toBeVisible();

    await openSpotlight(page);
    await page.getByLabel('Spotlight search').fill('MVP Journey');
    await expect(page.getByRole('option', { name: /MVP Journey Bookmark/i }).first()).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByLabel('Add tag').fill('MVP Journey Tag');
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Bookmark tags').getByText('MVP Journey Tag', { exact: true })).toBeVisible();

    for (const view of views) {
      await page.getByRole('button', { name: view.name }).click();
      await expect(page.locator(`[data-view="${view.attr}"]`)).toBeVisible();
    }

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('tab', { name: 'General' }).click();
    const downloadPromise = page.waitForEvent('download');
    await settings.getByRole('button', { name: 'Export', exact: true }).click();
    const download = await downloadPromise;
    expect(await download.suggestedFilename()).toMatch(/\.json$/i);

    await settings.locator('[data-testid="import-file-input"]').setInputFiles(resolve(fixtures, 'valid-library.json'));
    const confirm = page.getByRole('dialog', { name: 'Overwrite current library?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Overwrite and import' }).click();
    await expect(settings.getByText('Imported 1 bookmarks')).toBeVisible();

    await settings.getByRole('tab', { name: 'Appearance' }).click();
    await settings.getByRole('button', { name: /Ocean/ }).click();
    await settings.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-025-local-mvp-journey.png'),
      fullPage: true,
    });
  });
});
