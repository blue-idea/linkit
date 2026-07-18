import { expect, type Page } from '@playwright/test';

/** 默认 English：进入本地模式（REQ-023-AC-004）。 */
export async function enterLocalMode(page: Page) {
  await page.getByRole('button', { name: 'Continue in local mode' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

export async function expectLoginGate(page: Page) {
  await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
}
