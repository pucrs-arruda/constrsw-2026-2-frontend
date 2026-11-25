import { expect, test } from '@playwright/test';

import { loginOauth } from '../helpers/auth-api';
import { E2E_PREFIX } from '../helpers/env';
import {
  createClassInRoom,
  createFeature,
  createRoom,
  currentSemester,
  purgeE2eRooms,
  seedRoomBody,
  type RoomRead,
} from '../helpers/rooms-api';
import { dialogRoot, loginViaUi } from '../helpers/ui';

/**
 * Jornada da UX-ROOMS (Grupo 08) na SPA real, contra a stack do Compose.
 *
 * O que os testes de unidade não alcançam e aqui se prova: a tela fala com a BFF de verdade, a
 * composição T3 chega renderizada, e o ciclo de escrita fecha pela interface, não por curl.
 *
 * Idempotente: a massa leva o prefixo `E2E-` e é apagada antes e depois.
 */
test.describe('UX-ROOMS', () => {
  const runId = Date.now().toString(36).slice(-6);
  let token: string;
  let seeded: RoomRead;

  test.beforeAll(async () => {
    token = (await loginOauth()).access_token;
    await purgeE2eRooms(token);

    seeded = await createRoom(token, seedRoomBody(`LIST-${runId}`));
    await createFeature(token, seeded.id, 'RAMPA', 'Rampa de acesso do teste E2E');
    await createClassInRoom(token, seeded.id, `T-${runId}`);
  });

  test.afterAll(async () => {
    await purgeE2eRooms((await loginOauth()).access_token);
  });

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
  });

  test('chega em Salas pelo menu e lista a sala semeada', async ({ page }) => {
    await page.getByRole('link', { name: 'Salas de Aula' }).click();
    await expect(page).toHaveURL(/\/salas$/);
    await expect(page.getByRole('heading', { name: 'Salas de Aula' })).toBeVisible();

    await expect(page.getByRole('cell', { name: seeded.code, exact: true })).toBeVisible();
  });

  test('a coluna de turmas mostra a composição T3 da BFF', async ({ page }) => {
    await page.goto('/salas');
    const row = page.getByRole('row').filter({ hasText: seeded.code });
    await expect(row).toBeVisible();

    // A turma semeada é do semestre em curso: a composição tem de contá-la.
    await expect(row.getByRole('cell', { name: '1', exact: true })).toBeVisible();
  });

  test('o detalhe traz a turma do semestre e o recurso de acessibilidade', async ({ page }) => {
    await page.goto('/salas');
    await page
      .getByRole('row')
      .filter({ hasText: seeded.code })
      .getByRole('link', { name: /Abrir/ })
      .click();

    await expect(page).toHaveURL(new RegExp(`/salas/${seeded.id}$`));
    await expect(page.getByRole('heading', { name: `Sala ${seeded.code}` })).toBeVisible();

    const { year, semester } = currentSemester();
    await expect(
      page.getByRole('heading', { name: `Turmas no semestre ${year}/${semester}` }),
    ).toBeVisible();
    await expect(page.getByText(`${E2E_PREFIX}T-${runId}`)).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Recursos de acessibilidade' })).toBeVisible();
    await expect(page.getByText('RAMPA', { exact: true })).toBeVisible();
  });

  test('cria uma sala pelo formulário e ela aparece na lista', async ({ page }) => {
    const code = `${E2E_PREFIX}NOVA-${runId}`;
    await page.goto('/salas');
    await page.getByRole('button', { name: 'Nova sala' }).click();

    const dialog = dialogRoot(page);
    await expect(dialog.getByRole('heading', { name: 'Nova sala' })).toBeVisible();
    // Os rótulos se repetem no painel de filtros da lista; preencher dentro do diálogo.
    await dialog.getByRole('textbox', { name: 'Código' }).fill(code);
    await dialog.getByRole('textbox', { name: 'Nome' }).fill(`${E2E_PREFIX}Sala criada pelo E2E`);
    await dialog.getByRole('textbox', { name: 'Prédio' }).fill('32');
    await dialog.getByRole('spinbutton', { name: 'Capacidade' }).fill('25');
    await dialog.getByRole('button', { name: 'Criar sala' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('cell', { name: code, exact: true })).toBeVisible();
  });

  test('excluir pede confirmação e a sala some da lista', async ({ page }) => {
    const code = `${E2E_PREFIX}DEL-${runId}`;
    await createRoom(token, { ...seedRoomBody(`DEL-${runId}`), code });

    await page.goto('/salas');
    const row = page.getByRole('row').filter({ hasText: code });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /Excluir/ }).click();

    const dialog = dialogRoot(page);
    await expect(dialog.getByRole('heading', { name: /Excluir sala/ })).toBeVisible();
    await dialog.getByRole('button', { name: 'Excluir sala' }).click();

    // Exclusão lógica: a sala some das consultas, e é isso que a tela deve refletir.
    await expect(page.getByRole('cell', { name: code, exact: true })).toBeHidden();
  });

  test('o filtro por código encontra a sala e o estado vai para a URL', async ({ page }) => {
    await page.goto('/salas');
    await page.getByLabel('Buscar salas').fill(seeded.code);

    await expect(page.getByRole('cell', { name: seeded.code, exact: true })).toBeVisible();
    await expect(page).toHaveURL(/[?&]q=/);
  });

  test('o layout compacto mostra o caminho de volta para a lista', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`/salas/${seeded.id}`);

    await expect(page.getByRole('heading', { name: `Sala ${seeded.code}` })).toBeVisible();
    await expect(page.getByRole('link', { name: /Voltar para Salas de Aula/ })).toBeVisible();
  });
});
