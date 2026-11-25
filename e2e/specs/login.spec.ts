import { expect, test } from '@playwright/test';
import { E2E_PASSWORD, E2E_USERNAME } from '../helpers/env';
import { loginViaUi, logoutViaUi } from '../helpers/ui';

test.describe('UX-LOGIN', () => {
  test('recusa credencial inválida com banner sem enumerar conta', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByText('Closed CRAS').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    await page.getByLabel('Usuário').fill('nobody@pucrs.br');
    await page.getByLabel('Senha').fill('wrong-password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    // 401 → refusal; se o IdP oscilar no lab → identity (ambos são banner role=alert).
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('alert')).toContainText(
      /Não foi possível entrar\. Verifique usuário e senha\.|Identidade indisponível\./,
    );
    await expect(page).toHaveURL(/\/login/);
  });

  test('login feliz leva à Home e Sair volta ao login', async ({ page }) => {
    await loginViaUi(page, E2E_USERNAME, E2E_PASSWORD);
    await expect(page.getByText('Bem-vindo ao Closed CRAS')).toBeVisible();
    await expect(page.getByText(/admin@pucrs\.br|admin/i).first()).toBeVisible();
    await logoutViaUi(page);
  });
});
