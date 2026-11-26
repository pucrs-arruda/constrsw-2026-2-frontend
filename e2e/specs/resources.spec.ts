import { expect, test, type Page } from '@playwright/test';
import { loginOauth } from '../helpers/auth-api';
import {
  createResource,
  purgeE2eResources,
  type ResourceSeeded,
} from '../helpers/resources-api';
import { dialogRoot, loginViaUi, openNav, selectMatOption } from '../helpers/ui';

/** Codes accept only [A-Z0-9-]; keep the run id short and uppercase. */
function code(prefix: string, runId: string): string {
  return `E2E-${prefix}-${runId}`.toUpperCase().slice(0, 32);
}

test.describe('UX-RESOURCES', () => {
  const runId = Date.now().toString(36);
  let seeded: ResourceSeeded;

  test.beforeAll(async () => {
    const { access_token } = await loginOauth();
    await purgeE2eResources(access_token);
    seeded = await createResource(access_token, {
      code: code('PROJ', runId),
      name: `E2E Projetor ${runId}`,
      type: 'PROJECTOR',
      tags: ['av'],
    });
  });

  test.afterAll(async () => {
    const { access_token } = await loginOauth();
    await purgeE2eResources(access_token);
  });

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
  });

  async function openList(page: Page): Promise<void> {
    await openNav(page, 'Recursos');
    await expect(page.getByRole('heading', { name: 'Recursos', level: 1 })).toBeVisible();
    await expect(page.getByText(seeded.name, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  test('6.1 lista: colunas, rótulos pt-BR e busca', async ({ page }) => {
    await openList(page);

    for (const header of ['Nome', 'Status', 'Tipo', 'Reservas futuras']) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
    const row = page.getByRole('row').filter({ hasText: seeded.name });
    await expect(row).toContainText('Projetor');
    await expect(row).toContainText('Ativo');
    await expect(row).not.toContainText('PROJECTOR');

    const search = page.getByLabel('Buscar');
    await search.fill('zzzz-no-match-e2e');
    await expect(page.getByText('Nenhum resultado para a busca.')).toBeVisible();
    await search.fill(seeded.code.toLowerCase());
    await expect(row).toBeVisible();
  });

  test('6.2 criar e editar (ativo → inativo)', async ({ page }) => {
    await openList(page);
    const name = `E2E Câmera ${runId}`;

    await page.getByRole('button', { name: 'Novo recurso' }).click();
    const dialog = dialogRoot(page);
    await expect(dialog.getByRole('heading', { name: 'Novo recurso' })).toBeVisible();
    await dialog.getByLabel('Código').fill(code('CAM', runId).toLowerCase());
    await dialog.getByLabel('Nome').fill(name);
    await selectMatOption(page, 'Tipo', 'Câmera');
    await dialog.getByRole('button', { name: 'Salvar' }).click();

    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toContainText('Câmera');
    await expect(row).toContainText('Ativo');

    await row.getByRole('button', { name: 'Editar' }).click();
    await expect(dialog.getByLabel('Código')).toBeDisabled();
    await expect(dialog.getByLabel('Código')).toHaveValue(code('CAM', runId));
    await selectMatOption(page, 'Status', 'Inativo');
    await expect(dialog.getByText('Recursos inativos não podem ser reservados.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Salvar' }).click();

    await expect(row).toContainText('Inativo');
  });

  test('6.2 código duplicado mantém o formulário com recusa', async ({ page }) => {
    await openList(page);
    await page.getByRole('button', { name: 'Novo recurso' }).click();
    const dialog = dialogRoot(page);
    await dialog.getByLabel('Código').fill(seeded.code);
    await dialog.getByLabel('Nome').fill('Duplicado');
    await selectMatOption(page, 'Tipo', 'Projetor');
    await dialog.getByRole('button', { name: 'Salvar' }).click();

    await expect(dialog.getByRole('alert')).toContainText(
      'Já existe um recurso com este código.',
    );
    await expect(dialog.getByLabel('Nome')).toHaveValue('Duplicado');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('6.3/6.4 detalhe: ocorrência registrada e resolvida, reservas futuras', async ({
    page,
  }) => {
    await openList(page);
    await page
      .getByRole('row')
      .filter({ hasText: seeded.name })
      .getByRole('button', { name: 'Abrir' })
      .click();

    await expect(page.getByRole('heading', { name: seeded.name, level: 1 })).toBeVisible();
    await expect(page.getByText('Ficha do recurso e ocorrências.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reservas futuras' })).toBeVisible();
    await expect(page.getByText('Somente leitura. As reservas são feitas no detalhe da aula.')).toBeVisible();

    const occurrences = page.locator('.resource-detail__occurrences');
    await page.getByRole('button', { name: 'Registrar ocorrência' }).click();
    const dialog = dialogRoot(page);
    await dialog.getByLabel('Descrição').fill('Lâmpada fraca');
    await selectMatOption(page, 'Tipo', 'Defeito');
    await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();

    await expect(occurrences).toContainText('Lâmpada fraca — Aberta');
    await expect(occurrences.locator('.resource-detail__count')).toHaveText('1');

    await occurrences
      .getByRole('button', { name: 'Resolver ocorrência Lâmpada fraca' })
      .click();
    await dialog.getByLabel('Resolução').fill('Lâmpada substituída');
    await dialog.getByRole('button', { name: 'Resolver', exact: true }).click();

    await expect(occurrences).toContainText('Lâmpada fraca — Resolvida');
    await expect(occurrences).toContainText('Resolução: Lâmpada substituída');
    await expect(occurrences.locator('.resource-detail__count')).toHaveText('0');
  });

  test('Excluir: ocorrência no detalhe e recurso na lista', async ({ page }) => {
    const { access_token } = await loginOauth();
    const doomed = await createResource(access_token, {
      code: code('DEL', runId),
      name: `E2E Excluir ${runId}`,
      type: 'CABLE',
    });

    await page.goto(`/recursos/${doomed.id}`);
    await expect(page.getByRole('heading', { name: doomed.name, level: 1 })).toBeVisible();
    const occurrences = page.locator('.resource-detail__occurrences');
    await page.getByRole('button', { name: 'Registrar ocorrência' }).click();
    const dialog = dialogRoot(page);
    await dialog.getByLabel('Descrição').fill('Conector solto');
    await selectMatOption(page, 'Tipo', 'Dano');
    await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect(occurrences).toContainText('Conector solto — Aberta');

    await occurrences
      .getByRole('button', { name: 'Excluir ocorrência Conector solto' })
      .click();
    await expect(dialogRoot(page).getByRole('heading', { name: 'Excluir ocorrência?' })).toBeVisible();
    await dialogRoot(page).getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(occurrences).toContainText('Nenhuma ocorrência registrada.');

    await page.getByRole('link', { name: 'Voltar para Recursos' }).click();
    const row = page.getByRole('row').filter({ hasText: doomed.name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Excluir' }).click();
    await expect(
      dialogRoot(page).getByRole('heading', { name: `Excluir ${doomed.name}?` }),
    ).toBeVisible();
    // The DELETE is sent after the dialog finishes closing; wait for it before
    // asserting (rows behind an open dialog are aria-hidden and match 0 anyway).
    const deleted = page.waitForResponse(
      (res) =>
        res.request().method() === 'DELETE' &&
        res.url().endsWith(`/api/v1/resources/${doomed.id}`),
    );
    await dialogRoot(page).getByRole('button', { name: 'Excluir', exact: true }).click();
    expect((await deleted).status()).toBe(204);
    await expect(page.locator('mat-dialog-container')).toHaveCount(0);
    await expect(page.getByText(doomed.name, { exact: true })).toHaveCount(0);

    await page.goto(`/recursos/${doomed.id}`);
    await expect(page.getByText('Recurso não encontrado.')).toBeVisible();
  });

  for (const viewport of [
    { width: 360, height: 780 },
    { width: 768, height: 1024 },
  ]) {
    test(`sem rolagem horizontal em ${viewport.width}px (lista e detalhe)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/recursos');
      await expect(page.getByText(seeded.name, { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });
      const listOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(listOverflow).toBeLessThanOrEqual(0);

      await page.goto(`/recursos/${seeded.id}`);
      await expect(page.getByRole('heading', { name: seeded.name, level: 1 })).toBeVisible();
      const detailOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(detailOverflow).toBeLessThanOrEqual(0);
    });
  }
});
