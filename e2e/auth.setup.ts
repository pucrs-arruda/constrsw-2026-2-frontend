import { expect, test as setup } from '@playwright/test';
import { E2E_PASSWORD, E2E_USERNAME } from './helpers/env';
import { ensureFuncionarioRole } from './helpers/keycloak-roles';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await ensureFuncionarioRole();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Usuário').fill(E2E_USERNAME);
  await page.getByLabel('Senha').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible({
    timeout: 60_000,
  });
  await page.context().storageState({ path: authFile });
});
