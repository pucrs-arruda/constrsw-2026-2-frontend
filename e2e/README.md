# E2E frontend (Playwright)

Suite fim-a-fim da SPA Closed CRAS cobrindo telas já implementadas (login, shell/home, placeholders de domínio e UX-EMPLOYEES).

## Pré-requisitos

Stack Compose com pelo menos:

- `frontend` (`http://127.0.0.1:4200`)
- `oauth` (`8181`)
- `keycloak` (`8081`)
- `employees` (`8184`)
- `api` / BFF (identidade `/api/v1/identidade/me`)

```bash
docker compose up -d --build postgresql keycloak oauth employees bff frontend
```

## Comandos

Na pasta `frontend/`:

```bash
npm run e2e
npm run e2e:ui
npm run e2e:report
```

## Massa de dados

- Prefixo estável `E2E-` em matrícula/nome.
- `global-setup` e `afterAll` fazem purge (DELETE) — suite idempotente.
- Seed via API do serviço `employees` (não pela UI).
- Garante realm role `funcionario` no usuário de lab (`admin@pucrs.br` por padrão), necessária para CTAs de escrita.

## BFF → employees

A UI chama `/api/v1/employees*` no BFF (`api` / porta `8180`). O módulo `EmployeesModule` no BFF faz proxy pass-through para o serviço `employees`. Seed/purge do harness ainda usam a API do domínio em `E2E_EMPLOYEES_URL` (mais rápido e estável).

## Variáveis opcionais

| Variável | Default |
|---|---|
| `E2E_BASE_URL` | `http://127.0.0.1:4200` |
| `E2E_OAUTH_URL` | `http://127.0.0.1:8181` |
| `E2E_BFF_URL` | `http://127.0.0.1:8180` |
| `E2E_EMPLOYEES_URL` | `http://127.0.0.1:8184` |
| `E2E_KEYCLOAK_URL` | `http://127.0.0.1:8081` |
| `E2E_USERNAME` / `E2E_PASSWORD` | `admin@pucrs.br` / `a12345678` |

Não commitar `.env` com segredos.
