/** Lab defaults — override via env sem tocar `.env` do Compose. */
export const E2E_BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4200';
export const E2E_OAUTH_URL = process.env.E2E_OAUTH_URL ?? 'http://127.0.0.1:8181';
export const E2E_BFF_URL = process.env.E2E_BFF_URL ?? 'http://127.0.0.1:8180';
export const E2E_EMPLOYEES_URL =
  process.env.E2E_EMPLOYEES_URL ?? 'http://127.0.0.1:8184';
/** resources service (grupo06) direct — only for E2E cleanup (soft DELETE). */
export const E2E_RESOURCES_URL =
  process.env.E2E_RESOURCES_URL ?? 'http://127.0.0.1:8188';
export const E2E_KEYCLOAK_URL =
  process.env.E2E_KEYCLOAK_URL ?? 'http://127.0.0.1:8081';
export const E2E_KEYCLOAK_REALM = process.env.E2E_KEYCLOAK_REALM ?? 'constrsw';
export const E2E_KEYCLOAK_ADMIN_USER =
  process.env.E2E_KEYCLOAK_ADMIN_USER ?? 'admin';
export const E2E_KEYCLOAK_ADMIN_PASSWORD =
  process.env.E2E_KEYCLOAK_ADMIN_PASSWORD ?? 'a12345678';

/** Usuário lab com senha compartilhada do realm. */
export const E2E_USERNAME = process.env.E2E_USERNAME ?? 'admin@pucrs.br';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'a12345678';

/** Prefixo estável para achar/apagar massa do E2E com segurança. */
export const E2E_PREFIX = 'E2E-';
