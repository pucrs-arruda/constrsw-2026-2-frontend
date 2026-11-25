import { expect, test } from '@playwright/test';
import { loginOauth } from '../helpers/auth-api';
import {
  createDependent,
  createEmployee,
  purgeE2eEmployees,
  seedDependentBody,
  seedEmployeeBody,
  type EmployeeRead,
} from '../helpers/employees-api';
import { E2E_PREFIX } from '../helpers/env';
import {
  dialogRoot,
  fillMatField,
  loginViaUi,
  openNav,
  selectMatOption,
} from '../helpers/ui';

test.describe('UX-EMPLOYEES', () => {
  let token: string;
  let seeded: EmployeeRead;
  const runId = `${Date.now().toString(36)}`;

  test.beforeAll(async () => {
    const tokens = await loginOauth();
    token = tokens.access_token;
    await purgeE2eEmployees(token);
    seeded = await createEmployee(token, seedEmployeeBody(`LIST-${runId}`));
    await createDependent(
      token,
      seeded.id,
      seedDependentBody(`LIST-${runId}`),
    );
  });

  test.afterAll(async () => {
    const tokens = await loginOauth();
    await purgeE2eEmployees(tokens.access_token);
  });

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
  });

  test('lista: busca, Abrir e CTA Novo', async ({ page }) => {
    await openNav(page, 'Funcionários');
    await expect(
      page.getByRole('heading', { name: 'Funcionários' }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: seeded.name }).or(
        page.getByText(seeded.name, { exact: true }).first(),
      ),
    ).toBeVisible({ timeout: 30_000 });

    const search = page.getByLabel('Buscar');
    await search.fill('zzzz-no-match-e2e');
    await expect(
      page.getByText('Nenhum resultado para a busca.'),
    ).toBeVisible();
    await search.fill(seeded.registrationNumber);
    await expect(page.getByText(seeded.name).first()).toBeVisible();

    await page.getByRole('button', { name: 'Abrir' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/funcionarios/${seeded.id}`));
    await expect(
      page.getByRole('heading', { name: 'Detalhe do funcionário' }),
    ).toBeVisible();

    await openNav(page, 'Funcionários');
    await expect(
      page.getByRole('button', { name: 'Novo funcionário' }),
    ).toBeVisible();
  });

  test('criar via Novo: formulário, Cancelar e Salvar', async ({ page }) => {
    await openNav(page, 'Funcionários');
    await page.getByRole('button', { name: 'Novo funcionário' }).click();
    await expect(page).toHaveURL(/\/funcionarios\/novo/);
    const dialog = dialogRoot(page);
    await expect(
      dialog.getByRole('heading', { name: 'Novo funcionário' }),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/funcionarios$/);

    await page.getByRole('button', { name: 'Novo funcionário' }).click();
    const createDialog = dialogRoot(page);
    const suffix = `NEW-${runId}`;
    await fillMatField(page, 'Matrícula', `${E2E_PREFIX}${suffix}`);
    await fillMatField(page, 'Nome', `${E2E_PREFIX}Funcionario ${suffix}`);
    await fillMatField(page, 'Salário', '3200');
    await fillMatField(page, 'Data de admissão', '2025-01-10');
    await fillMatField(page, 'Cargo', 'Dev E2E');
    await selectMatOption(page, 'Situação', 'Ativo');
    await fillMatField(page, 'Telefone', '+55 51 98888-0002');
    await fillMatField(page, 'E-mail', `e2e.new.${runId}@pucrs.br`);
    await createDialog.getByRole('button', { name: 'Salvar' }).click();

    await expect(
      page.getByRole('heading', { name: 'Detalhe do funcionário' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('heading', {
        name: `${E2E_PREFIX}Funcionario ${suffix}`,
      }),
    ).toBeVisible();
  });

  test('detalhe: editar funcionário, dependentes CRUD e Excluir', async ({
    page,
  }) => {
    const tokens = await loginOauth();
    const emp = await createEmployee(
      tokens.access_token,
      seedEmployeeBody(`DET-${runId}`),
    );

    await page.goto(`/funcionarios/${emp.id}`);
    await expect(
      page.getByRole('heading', { name: emp.name }),
    ).toBeVisible();
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Nenhum dependente cadastrado.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Editar funcionário' }).click();
    const editEmp = dialogRoot(page);
    await expect(editEmp.getByText('Editar funcionário')).toBeVisible();
    await fillMatField(page, 'Cargo', 'Cargo Atualizado E2E');
    await selectMatOption(page, 'Situação', 'Inativo');
    await editEmp.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Cargo Atualizado E2E')).toBeVisible();
    await expect(page.getByText('Inativo')).toBeVisible();
    await expect(
      page.getByText('Cadastro inativo — permanece visível para consulta.'),
    ).toBeVisible();

    await page
      .locator('.employees-detail__dependents-header')
      .getByRole('button', { name: 'Novo' })
      .click();
    const createDep = dialogRoot(page);
    await expect(createDep.getByText('Novo dependente')).toBeVisible();
    await createDep.getByRole('button', { name: 'Cancelar' }).click();
    await expect(createDep).toBeHidden();

    await page
      .locator('.employees-detail__dependents-header')
      .getByRole('button', { name: 'Novo' })
      .click();
    const depDialog = dialogRoot(page);
    const depName = `${E2E_PREFIX}Dependente DET-${runId}`;
    await fillMatField(page, 'Nome', depName);
    await fillMatField(page, 'Data de nascimento', '2012-04-20');
    await fillMatField(page, 'Tipo de vínculo', 'Cônjuge');
    await selectMatOption(page, 'Situação', 'Ativo');
    await depDialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(depName)).toBeVisible({ timeout: 20_000 });

    await page
      .locator('.employees-detail__dependents')
      .getByRole('button', { name: 'Editar', exact: true })
      .click();
    const editDep = dialogRoot(page);
    await expect(editDep.getByText('Editar dependente')).toBeVisible();
    await fillMatField(page, 'Tipo de vínculo', 'Filho(a)');
    await editDep.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Filho(a)')).toBeVisible();

    await page
      .locator('.employees-detail__dependents')
      .getByRole('button', { name: 'Excluir', exact: true })
      .click();
    const confirm = dialogRoot(page);
    await expect(
      confirm.getByRole('heading', { name: /Excluir / }),
    ).toBeVisible();
    await confirm.getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(page.getByText('Nenhum dependente cadastrado.')).toBeVisible({
      timeout: 20_000,
    });
  });

  test('rota /funcionarios/novo abre dialog de criação', async ({ page }) => {
    await page.goto('/funcionarios/novo');
    const dialog = dialogRoot(page);
    await expect(dialog.getByText('Novo funcionário')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/funcionarios$/);
  });
});
