import { loginOauth } from './helpers/auth-api';
import { purgeE2eEmployees } from './helpers/employees-api';
import { ensureFuncionarioRole } from './helpers/keycloak-roles';
import {
  E2E_BASE_URL,
  E2E_BFF_URL,
  E2E_EMPLOYEES_URL,
  E2E_OAUTH_URL,
} from './helpers/env';

async function assertUp(url: string, label: string): Promise<void> {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok && res.status >= 500) {
      throw new Error(`${label} HTTP ${res.status}`);
    }
  } catch (err) {
    throw new Error(
      `Pré-requisito E2E: ${label} indisponível em ${url} (${String(err)}). Suba a stack Compose (frontend, oauth, keycloak, employees, bff).`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  await assertUp(E2E_BASE_URL, 'frontend');
  await assertUp(`${E2E_OAUTH_URL}/health`, 'oauth');
  await assertUp(`${E2E_BFF_URL}/health`, 'bff');
  await assertUp(`${E2E_EMPLOYEES_URL}/api/v1/health`, 'employees');

  // Keycloak pode demorar após restart — login precisa fechar 201 antes do seed.
  let tokens: Awaited<ReturnType<typeof loginOauth>> | null = null;
  const deadline = Date.now() + 90_000;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      tokens = await loginOauth();
      break;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
  if (!tokens) {
    throw new Error(`oauth login não recuperou a tempo: ${String(lastErr)}`);
  }

  await ensureFuncionarioRole();
  // Re-login após role (token antigo pode não trazer funcionario).
  tokens = await loginOauth();
  await purgeE2eEmployees(tokens.access_token);
}
