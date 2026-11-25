import { expect, test } from '@playwright/test';
import { NAV_PLACEHOLDERS } from '../helpers/nav-inventory';
import { loginViaUi, openNav } from '../helpers/ui';

test.describe('Shell + placeholders', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
  });

  test('Home e identidade do shell', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
    await expect(page.getByText('Closed CRAS').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeEnabled();
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }),
    ).toBeVisible();
  });

  for (const item of NAV_PLACEHOLDERS) {
    test(`placeholder ${item.label}`, async ({ page }) => {
      await openNav(page, item.label);
      await expect(page).toHaveURL(new RegExp(item.path));
      await expect(
        page.getByRole('heading', { name: item.label }),
      ).toBeVisible();
      await expect(
        page.getByText('Superfície em construção', { exact: false }),
      ).toBeVisible();
    });
  }
});
