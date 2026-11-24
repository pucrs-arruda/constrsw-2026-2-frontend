import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test('cadastro, plano, bibliografia, turmas e exclusão pelo BFF real', async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password)
    throw new Error('Defina E2E_USERNAME e E2E_PASSWORD para o OAuth local.');
  const config = await (await page.request.get('/config.json')).json();
  const login = await page.request.post(config.oauthBaseUrl + '/login', {
    multipart: { username, password },
  });
  expect(login.status(), 'login no OAuth').toBe(201);
  await login.dispose();

  const path = config.bffBaseUrl + '/api/v1/courses';
  const code = 'UI-' + randomUUID().slice(0, 12);
  const name = 'Disciplina ' + code;
  const dialog = page.locator('app-course-editor');
  const save = () => dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  const confirmDelete = () =>
    page
      .locator('app-confirm-dialog')
      .getByRole('button', { name: 'Excluir', exact: true })
      .click();
  let id: string | undefined;
  try {
    await page.goto('/');
    await page.getByRole('link', { name: 'Disciplinas' }).click();
    await page.getByRole('button', { name: 'Nova disciplina', exact: true }).first().click();
    await dialog.getByLabel('Código').fill(code);
    await dialog.getByLabel('Nome', { exact: true }).fill(name);
    await dialog.getByLabel('Carga horária').fill('60');
    await dialog.getByLabel('Título').fill('Referência inicial');
    await dialog.getByLabel('Autores').fill('Autora de teste');
    const created = page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/courses'),
    );
    await save();
    const response = await created;
    expect(response.status()).toBe(201);
    id = (await response.json()).id;
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByText('Nenhuma turma vinculada no semestre vigente.')).toBeVisible();

    await page.getByRole('button', { name: 'Editar disciplina' }).click();
    await dialog.getByLabel('Carga horária').fill('80');
    await save();
    await expect(page.getByText('80 horas')).toBeVisible();
    await page
      .locator('app-courses')
      .screenshot({ animations: 'disabled', path: test.info().outputPath('detalhe-desktop.png') });

    await page.getByRole('button', { name: 'Excluir referência Referência inicial' }).click();
    await confirmDelete();
    await expect(
      page.getByRole('alert').filter({ hasText: 'manter pelo menos uma referência' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Nova referência' }).click();
    await dialog.getByLabel('Título').fill('Segunda obra');
    await dialog.getByLabel('Autores').fill('Outra autora');
    await save();
    await page.getByRole('button', { name: 'Editar referência Segunda obra' }).click();
    await dialog.getByLabel('Título').fill('Obra revisada');
    await save();
    await page.getByRole('button', { name: 'Excluir referência Obra revisada' }).click();
    await confirmDelete();
    await expect(page.getByText('Referência inicial', { exact: true })).toBeVisible();
    await expect(page.getByText('Obra revisada', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Novo item do plano' }).click();
    await dialog.getByLabel('Enunciado').fill('Unidade de teste');
    await save();
    await page.getByRole('button', { name: 'Editar item 1' }).click();
    await dialog.getByLabel('Enunciado').fill('Unidade revisada');
    await save();
    await expect(page.getByText('Unidade revisada')).toBeVisible();
    await page.getByRole('button', { name: 'Excluir item 1' }).click();
    await confirmDelete();
    await expect(page.getByText('Nenhum item cadastrado no plano de ensino.')).toBeVisible();

    await page.getByRole('link', { name: 'Voltar ao catálogo' }).click();
    await page.getByLabel('Buscar por código ou nome').fill(code);
    await page.getByRole('button', { name: 'Nova disciplina', exact: true }).click();
    await dialog.getByLabel('Código').fill(code);
    await dialog.getByLabel('Nome', { exact: true }).fill(name);
    await dialog.getByLabel('Carga horária').fill('60');
    await dialog.getByLabel('Título').fill('Referência de teste');
    await dialog.getByLabel('Autores').fill('Autora de teste');
    await save();
    await expect(dialog.getByRole('alert')).toContainText('Este código já está em uso.');
    await expect(dialog.getByLabel('Título')).toHaveValue('Referência de teste');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await page
      .locator('app-confirm-dialog')
      .getByRole('button', { name: 'Descartar', exact: true })
      .click();
    for (const width of [1280, 768, 360]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.getByRole('link', { name: 'Abrir ' + name })).toBeVisible();
      expect(
        await page.locator('app-courses').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      if (width < 840) {
        await expect
          .poll(() =>
            page
              .locator('tr[mat-row]')
              .evaluate((row) =>
                Math.abs(
                  row.getBoundingClientRect().width -
                    row.closest('table')!.getBoundingClientRect().width,
                ),
              ),
          )
          .toBeLessThan(2);
      }
      await page.screenshot({
        animations: 'disabled',
        path: test.info().outputPath('catalogo-' + width + '.png'),
      });
    }
    await page.getByRole('button', { name: 'Editar ' + name }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Salvar' })).toBeInViewport();
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('edicao-compacta.png'),
    });
    await dialog.getByLabel('Nome', { exact: true }).fill('Alteração descartada');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await page
      .locator('app-confirm-dialog')
      .getByRole('button', { name: 'Descartar', exact: true })
      .click();
    await page.getByRole('button', { name: 'Excluir ' + name }).click();
    const deleted = page.waitForResponse(
      (r) =>
        r.request().method() === 'DELETE' && new URL(r.url()).pathname.endsWith('/courses/' + id),
    );
    await confirmDelete();
    expect((await deleted).status()).toBe(204);
    await expect(page.locator('app-confirm-dialog')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Abrir ' + name })).toHaveCount(0);
    expect((await page.request.get(path + '/' + id)).status()).toBe(404);
  } finally {
    if (id) {
      const cleanup = await page.request.delete(path + '/' + id);
      expect([204, 404], 'limpeza da disciplina temporária').toContain(cleanup.status());
    }
  }
});
