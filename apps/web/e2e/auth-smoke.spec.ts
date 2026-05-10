import { expect, test } from '@playwright/test';

test('renders the login screen', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Licensing Portal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
