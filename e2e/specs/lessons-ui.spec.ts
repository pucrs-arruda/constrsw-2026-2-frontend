import { expect, Page, test } from '@playwright/test';

const classId = '11111111-1111-4111-8111-111111111111';
const lessonId = '22222222-2222-4222-8222-222222222222';
const topicId = '33333333-3333-4333-8333-333333333333';
const turma = { id: classId, code: 'SE-A', courseId: 'course', professorId: 'p', roomId: 'r', studentIds: [],
  startDate: '2026-11-01', endDate: '2026-11-30', seats: 40, year: 2026, semester: 2, status: 'active', enabled: true };

async function fixtures(page: Page, roles = ['coordinator'], refusal = false) {
  let lessons: Record<string, unknown>[] = [];
  await page.route('**/oauth/**', route => route.fulfill({ status: 201, json: { access_token: 'ui-test-token', token_type: 'Bearer', expires_in: 3600 } }));
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    const method = request.method();
    const json = (value: unknown, status = 200) => route.fulfill({ status, json: value });
    if (path === '/api/v1/identidade/me') return json({ sub: 'u', professorId: 'p', email: 'coordinator@pucrs.br', papeis: roles });
    if (path === '/api/v1/classes/' + classId) return json(turma);
    if (path === '/api/v1/classes') return json([turma]);
    if (path === '/api/v1/courses/course/syllabus-items') return json([{ id: 'syllabus', order: 1, statement: 'Plano de ensino' }]);
    if (path === '/api/v1/courses') return json([{ id: 'course', code: 'CS', name: 'Construção de Software' }]);
    if (path === '/api/v1/rooms') return json([{ id: 'r', code: 'B201', name: 'Sala B201' }]);
    if (path === '/api/v1/professors') return json([{ id: 'p', employeeId: 'e', active: true, employeeName: 'Marina Silva' }]);
    if (path === '/api/v1/students') return json([]);
    if (path === '/api/v1/lessons/generate') {
      if (refusal) return json({ error_code: 'LE-409', error_description: 'A turma já teve aulas geradas.' }, 409);
      lessons = [{ id: lessonId, classId, date: '2026-11-04', timeSlotId: 'H', modality: 'IN_PERSON', hasAssessment: false, enabled: true, effectiveRoomId: 'r', topics: [] }];
      return json(lessons, 201);
    }
    if (path === '/api/v1/lessons') {
      if (method === 'GET') return json(lessons);
      const lesson = { ...request.postDataJSON(), id: lessonId, enabled: true, effectiveRoomId: 'r', topics: [] };
      lessons = [lesson]; return json(lesson, 201);
    }
    if (path === '/api/v1/lessons/' + lessonId) {
      if (method === 'GET') return json(lessons[0]);
      if (method === 'DELETE') { lessons = []; return route.fulfill({ status: 204 }); }
      lessons[0] = { ...lessons[0], ...request.postDataJSON() };
      if (lessons[0]['modality'] === 'REMOTE') delete lessons[0]['effectiveRoomId'];
      return json(lessons[0]);
    }
    if (path === `/api/v1/lessons/${lessonId}/topics` && method === 'POST') {
      const topic = { ...request.postDataJSON(), id: topicId, lessonId, enabled: true };
      lessons[0]['topics'] = [topic]; return json(topic, 201);
    }
    if (path === `/api/v1/lessons/${lessonId}/topics/${topicId}`) {
      if (method === 'DELETE') { lessons[0]['topics'] = []; return route.fulfill({ status: 204 }); }
      const topic = { ...request.postDataJSON(), id: topicId, lessonId, enabled: true };
      lessons[0]['topics'] = [topic]; return json(topic);
    }
    return json({ error_description: 'Rota não prevista na fixture.' }, 404);
  });
}

test.describe('Aulas — jornada de interface com fixtures HTTP', () => {
  for (const width of [360, 768, 1280]) {
    test(`gera, abre e edita em ${width}px sem overflow`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 }); await fixtures(page);
      await page.goto(`/turmas/${classId}?aba=aulas`);
      await expect(page.getByText('Nenhuma aula cadastrada')).toBeVisible();
      await page.getByRole('button', { name: 'Gerar aulas', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Gerar aulas', exact: true }).click();
      await expect(page.getByText('04/11/2026 · Faixa H', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`aulas-${width}.png`), fullPage: true });
      if (width < 600) await page.locator('.rdt-list__text').click();
      else await page.getByRole('button', { name: 'Abrir', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Tópicos da aula' })).toBeVisible();
      await page.getByRole('button', { name: 'Editar aula', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByLabel('Data da aula')).toBeDisabled();
      await expect(dialog.getByLabel('Faixa', { exact: true })).toBeDisabled();
      if (width < 600) {
        const box = await dialog.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(width - 2);
      }
      await dialog.getByLabel('Aula com avaliação').check();
      await dialog.getByRole('button', { name: 'Salvar aula', exact: true }).click();
      await expect(page.getByText('Com avaliação', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test('cria aula, mantém tópicos e exclui dentro da turma', async ({ page }) => {
    await fixtures(page); await page.goto(`/turmas/${classId}?aba=aulas`);
    await page.getByRole('button', { name: 'Nova aula', exact: true }).click();
    await page.getByLabel('Data da aula').fill('2026-11-04');
    await page.getByLabel('Faixa', { exact: true }).click(); await page.getByRole('option', { name: 'H', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar aula', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir', exact: true }).click();
    await page.getByRole('button', { name: 'Novo tópico', exact: true }).click();
    await page.getByLabel('Enunciado', { exact: true }).fill('Introdução aos testes');
    await page.getByRole('button', { name: 'Salvar tópico', exact: true }).click();
    await expect(page.getByText('Introdução aos testes', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Editar tópico 1', exact: true }).click();
    await page.getByLabel('Enunciado', { exact: true }).fill('Revisão dos testes');
    await page.getByRole('button', { name: 'Salvar tópico', exact: true }).click();
    await expect(page.getByText('Revisão dos testes', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Excluir tópico 1', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir tópico', exact: true }).click();
    await expect(page.getByText('Nenhum tópico cadastrado')).toBeVisible();
    await page.getByRole('button', { name: 'Excluir aula', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir aula', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/turmas/${classId}\\?aba=aulas$`));
    await expect(page.getByText('Nenhuma aula cadastrada')).toBeVisible();
  });

  test('mostra recusa do domínio e não anuncia geração bem-sucedida', async ({ page }) => {
    await fixtures(page, ['coordinator'], true); await page.goto(`/turmas/${classId}?aba=aulas`);
    await page.getByRole('button', { name: 'Gerar aulas', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Gerar aulas', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('A turma já teve aulas geradas.');
    await expect(page.getByText('Aulas geradas.', { exact: true })).toHaveCount(0);
  });

  test('aluno lê a aba sem ações de escrita', async ({ page }) => {
    await fixtures(page, ['student']); await page.goto(`/turmas/${classId}?aba=aulas`);
    await expect(page.getByText('Nenhuma aula cadastrada')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gerar aulas', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nova aula', exact: true })).toHaveCount(0);
  });
});
