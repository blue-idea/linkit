import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const screenshotDir = resolve('./screenshot');

test.describe('Generate README Screenshots', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('generate login screen screenshot', async ({ page }) => {
    // 0. Login screenshot
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: resolve(screenshotDir, 'login.png'),
      fullPage: true,
    });
  });

  test('generate all README screenshots with English initial data', async ({ page }) => {
    // 1. Dashboard screenshot
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: 'Continue in local mode' }).click();

    // Select Coolors card to open detail panel on right
    await page.getByLabel('Content Area').getByText('Coolors — Super Fast Color Schemes Generator').first().click();
    await expect(page.getByLabel('Detail Panel', { exact: true })).toBeVisible();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: resolve(screenshotDir, 'dashboard.png'),
      fullPage: true,
    });

    // 1b. Edit / View Notes screenshot
    await page.screenshot({
      path: resolve(screenshotDir, 'edit_notes.png'),
      fullPage: true,
    });

    // 2. Spotlight screenshot
    await page.getByLabel('Top bar').click();
    await page.keyboard.press('Control+k');
    const spotlightDialog = page.getByRole('dialog', { name: 'Spotlight' });
    await expect(spotlightDialog).toBeVisible();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: resolve(screenshotDir, 'spotlight.png'),
      fullPage: true,
    });

    // Close Spotlight
    await page.keyboard.press('Escape');
    await expect(spotlightDialog).not.toBeVisible();

    // 3. AI Insights screenshot
    await page.getByText('Insights', { exact: true }).click();
    const insightsDialog = page.getByRole('dialog', { name: 'Insights report' });
    await expect(insightsDialog).toBeVisible();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: resolve(screenshotDir, 'ai_insights.png'),
      fullPage: true,
    });

    // Close Insights
    await page.keyboard.press('Escape');
    await expect(insightsDialog).not.toBeVisible();

    // 4. Add Bookmark screenshot
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const newBookmarkDialog = page.getByRole('dialog', { name: 'New Bookmark' });
    await expect(newBookmarkDialog).toBeVisible();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: resolve(screenshotDir, 'add_bookmark.png'),
      fullPage: true,
    });

    // Close Add Bookmark
    await page.keyboard.press('Escape');
    await expect(newBookmarkDialog).not.toBeVisible();

    // 5. Settings screenshot
    await page.getByRole('button', { name: 'Settings' }).click();
    const settingsDialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(settingsDialog).toBeVisible();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: resolve(screenshotDir, 'settings.png'),
      fullPage: true,
    });

    // Close Settings
    await page.keyboard.press('Escape');
    await expect(settingsDialog).not.toBeVisible();
  });

  test('generate Health Check screenshot', async ({ page }) => {
    // 6. Health Check screenshot (using e2eHealth=1 for mock scan)
    await page.goto('/?e2eHealth=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: 'Continue in local mode' }).click();

    // Mock route for health scan requests so scan finishes cleanly
    await page.route('**/e2e-health/**', async (route) => {
      const changed = route.request().url().endsWith('/changed');
      await route.fulfill({
        status: changed ? 200 : 404,
        headers: { 'access-control-allow-origin': '*' },
        body: changed ? 'changed content' : 'missing',
      });
    });

    await page.getByLabel('Content Area').getByText('Coolors — Super Fast Color Schemes Generator').first().click();
    await expect(page.getByLabel('Detail Panel', { exact: true })).toBeVisible();

    await page
      .getByLabel('Detail Panel', { exact: true })
      .getByRole('button', { name: /Link is healthy|Content updated|Link may be broken/ })
      .click();

    const healthDialog = page.getByRole('dialog', { name: 'Health check' });
    await expect(healthDialog).toBeVisible();

    await healthDialog.getByRole('button', { name: 'Start scan' }).click();
    await expect(healthDialog.getByText('Scan completed')).toBeVisible();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: resolve(screenshotDir, 'health_check.png'),
      fullPage: true,
    });
  });
});
