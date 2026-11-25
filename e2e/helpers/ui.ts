import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { E2E_PASSWORD, E2E_USERNAME } from './env';

export async function loginViaUi(
  page: Page,
  username = E2E_USERNAME,
  password = E2E_PASSWORD,
): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await page.getByLabel('Usuário').fill(username);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible({
    timeout: 45_000,
  });
}

export async function logoutViaUi(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible({
    timeout: 20_000,
  });
}

export async function openNav(
  page: Page,
  label: string,
): Promise<void> {
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: label }).click();
}

export async function fillMatField(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const field = page.getByLabel(label, { exact: true });
  await field.click();
  await field.fill(value);
}

export async function selectMatOption(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

export function dialogRoot(page: Page): Locator {
  return page.locator('mat-dialog-container').last();
}
