import {
  E2E_KEYCLOAK_ADMIN_PASSWORD,
  E2E_KEYCLOAK_ADMIN_USER,
  E2E_KEYCLOAK_REALM,
  E2E_KEYCLOAK_URL,
  E2E_USERNAME,
} from './env';

async function adminToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: 'admin-cli',
    username: E2E_KEYCLOAK_ADMIN_USER,
    password: E2E_KEYCLOAK_ADMIN_PASSWORD,
    grant_type: 'password',
  });
  const res = await fetch(
    `${E2E_KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  );
  if (!res.ok) {
    throw new Error(`keycloak admin token: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

/**
 * Garante realm role `funcionario` no usuário de lab (idempotente).
 * O seed Keycloak não associa essa role aos usuários padrão; a SPA exige
 * `papeis` contendo `funcionario` para CTAs de escrita em UX-EMPLOYEES.
 */
export async function ensureFuncionarioRole(
  username = E2E_USERNAME,
): Promise<void> {
  const token = await adminToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const usersRes = await fetch(
    `${E2E_KEYCLOAK_URL}/admin/realms/${E2E_KEYCLOAK_REALM}/users?username=${encodeURIComponent(username)}&exact=true`,
    { headers },
  );
  if (!usersRes.ok) {
    throw new Error(`list users: ${usersRes.status} ${await usersRes.text()}`);
  }
  const users = (await usersRes.json()) as Array<{ id: string }>;
  const user = users[0];
  if (!user) {
    throw new Error(`Keycloak user not found: ${username}`);
  }

  // O realm versionado (`infrastructure/.../constrsw.json`) define administrator, coordinator,
  // professor e student — não `funcionario`. Sem criar a role quando falta, o global-setup aborta
  // e nenhuma suíte roda. Criar é idempotente: o 409 do Keycloak significa "já existe".
  let roleRes = await fetch(
    `${E2E_KEYCLOAK_URL}/admin/realms/${E2E_KEYCLOAK_REALM}/roles/funcionario`,
    { headers },
  );
  if (roleRes.status === 404) {
    const createRes = await fetch(
      `${E2E_KEYCLOAK_URL}/admin/realms/${E2E_KEYCLOAK_REALM}/roles`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'funcionario',
          description: 'Papel de lab exigido pelo E2E da SPA.',
        }),
      },
    );
    if (!createRes.ok && createRes.status !== 409) {
      throw new Error(
        `criar role funcionario: ${createRes.status} ${await createRes.text()}`,
      );
    }
    roleRes = await fetch(
      `${E2E_KEYCLOAK_URL}/admin/realms/${E2E_KEYCLOAK_REALM}/roles/funcionario`,
      { headers },
    );
  }
  if (!roleRes.ok) {
    throw new Error(
      `role funcionario: ${roleRes.status} ${await roleRes.text()}`,
    );
  }
  const role = await roleRes.json();

  const mappedRes = await fetch(
    `${E2E_KEYCLOAK_URL}/admin/realms/${E2E_KEYCLOAK_REALM}/users/${user.id}/role-mappings/realm`,
    { headers },
  );
  if (!mappedRes.ok) {
    throw new Error(
      `list role-mappings: ${mappedRes.status} ${await mappedRes.text()}`,
    );
  }
  const mapped = (await mappedRes.json()) as Array<{ name: string }>;
  if (mapped.some((r) => r.name === 'funcionario')) {
    return;
  }

  const assignRes = await fetch(
    `${E2E_KEYCLOAK_URL}/admin/realms/${E2E_KEYCLOAK_REALM}/users/${user.id}/role-mappings/realm`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify([role]),
    },
  );
  if (!assignRes.ok && assignRes.status !== 204) {
    throw new Error(
      `assign funcionario: ${assignRes.status} ${await assignRes.text()}`,
    );
  }
}
