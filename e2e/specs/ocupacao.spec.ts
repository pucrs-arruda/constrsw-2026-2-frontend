import { expect, test, type Page } from '@playwright/test';
import { loginViaUi, openNav, selectMatOption } from '../helpers/ui';

/**
 * UX-OCCUPANCY (Grupo 03) contra a stack do Compose.
 *
 * Usa a massa de demonstração do reservations (ligada por padrão na imagem), só leitura:
 * - 2026-12-08 faixa C: reservas ACTIVE S1 (recurso …0001) e S5 (recurso …0002);
 * - 2026-12-08 faixa D: reserva ACTIVE S3 (recurso …0002);
 * - 2026-12-13 é domingo (RN-01): ninguém ocupa.
 * Não escreve nada, então pode rodar de novo.
 */
const RECURSO_1 = '50000000-0000-4000-8000-000000000001';
const RECURSO_2 = '50000000-0000-4000-8000-000000000002';

const VIEWPORTS = [
  { name: 'compact', width: 360, height: 800 },
  { name: 'medium', width: 768, height: 1024 },
  { name: 'expanded', width: 1280, height: 800 },
] as const;

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('UX-OCCUPANCY', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
  });

  test('menu Ocupação abre a consulta com data de hoje e sem faixa', async ({ page }) => {
    await openNav(page, 'Ocupação');
    await expect(page).toHaveURL(/\/ocupacao$/);
    await expect(page.getByRole('heading', { name: 'Ocupação de recursos' })).toBeVisible();
    await expect(page.getByText('Escolha a data e a faixa.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar' })).toBeDisabled();
  });

  test('consulta pelo formulário põe a consulta na URL e lista o recurso', async ({ page }) => {
    await openNav(page, 'Ocupação');
    const data = page.getByLabel('Data', { exact: true });
    await data.fill('08/12/2026');
    await data.blur();
    await selectMatOption(page, 'Faixa', 'D');
    await page.getByRole('button', { name: 'Consultar' }).click();

    await expect(page).toHaveURL(/\/ocupacao\?data=2026-12-08&faixaId=D$/);
    await expect(page.getByText('1 recurso ocupado')).toBeVisible();
    await expect(page.getByText(RECURSO_2).first()).toBeVisible();
  });

  test('domingo: estado vazio em pt-BR', async ({ page }) => {
    await page.goto('/ocupacao?data=2026-12-13&faixaId=C');
    await expect(page.getByText('Nenhum recurso ocupado em 13/12/2026, faixa C.')).toBeVisible();
  });

  test('link inválido avisa e não consulta', async ({ page }) => {
    await page.goto('/ocupacao?data=2026-02-31&faixaId=C');
    await expect(page.getByRole('alert')).toContainText('data ou faixa inválida');
  });

  for (const vp of VIEWPORTS) {
    test(`link direto em ${vp.width}px (${vp.name}) lista os dois recursos sem scroll horizontal`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/ocupacao?data=2026-12-08&faixaId=C');

      await expect(page.getByText('2 recursos ocupados')).toBeVisible();
      await expect(page.getByText(RECURSO_1).first()).toBeVisible();
      await expect(page.getByText(RECURSO_2).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Abrir', exact: true })).toHaveCount(0);
      await expectNoHorizontalScroll(page);
    });
  }
});
