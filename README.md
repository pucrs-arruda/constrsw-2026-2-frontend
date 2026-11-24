# Frontend — Closed CRAS (SPA Angular 22)

Interface web responsiva do sistema **Closed CRAS**, desenvolvida com **Angular 22**, **Angular Material (Material Design 3)**, Angular CDK e SCSS, com foco no domínio de **Salas de Aula** (Grupo 08 - PUCRS ConstrSW 2026/2).

---

## 1. Stack Tecnológica

- **Framework**: Angular 22 (standalone components, signals, lazy-loading)
- **Design System**: Angular Material M3 + Angular CDK (`@angular/material`, `@angular/cdk`)
- **Estilos**: SCSS com tokens de design PUCRS e Material Design 3 (`DESIGN.md` / `EXPERIENCE.md`)
- **Fontes**: Source Sans 3 e Source Code Pro self-hosted via pacotes `@fontsource` (sem chamadas a CDNs externos em runtime)
- **Internacionalização**: `pt-BR` via `LOCALE_ID` e `registerLocaleData`
- **Servidor de Produção**: Nginx Alpine multi-stage com healthcheck e reverse proxy reverso para `/api/auth` (oauth) e `/api/bff` (BFF)

---

## 2. Estrutura de Pastas

A arquitetura do projeto segue a convenção estabelecida no plano de orquestração:

```
frontend/
├── Dockerfile                   # Build multi-stage (node:24-alpine + nginx:alpine)
├── nginx.conf                   # Proxy para oauth (8088) e BFF (3001), healthcheck e fallback SPA
├── proxy.conf.json              # Proxy de desenvolvimento local para ng serve
├── .dockerignore
├── README.md
├── angular.json, package.json, tsconfig*.json
├── public/
│   ├── config.json              # Configurações de baseUrl (/api/auth e /api/bff)
│   └── favicon.ico
└── src/
    ├── main.ts
    ├── index.html
    ├── styles.scss              # Estilos globais e fontes self-hosted
    ├── styles/                  # _tokens.scss, _theme.scss, _typography.scss
    └── app/
        ├── app.config.ts        # Configuração da aplicação (rotas, locale pt-BR, providers)
        ├── app.routes.ts        # Rotas da SPA (lazy-loading por path)
        ├── app.component.ts     # Componente raiz
        ├── core/
        │   ├── config/          # app-config.ts e injeção de APP_CONFIG
        │   ├── layout/          # shell, app-bar, nav-drawer, nav-items.ts
        │   ├── auth/            # auth.service.ts, auth.interceptor.ts, auth.guard.ts, identity.model.ts
        │   ├── http/            # api-error.ts, error-parser.ts, filter-query.ts (AG-06)
        │   └── ui/              # confirm-dialog, refusal-banner, error-banner, empty-state, skeleton
        └── features/
            ├── login/           # login.page.ts (AG-05)
            ├── home/            # home.page.ts (página de boas-vindas)
            ├── placeholder/     # placeholder.page.ts (rotas em-breve)
            └── rooms/           # data/ (AG-06), list/ (AG-07), detail/ (AG-08)
```

---

## 3. Como Rodar em Desenvolvimento

### Pré-requisitos
- Node.js ≥ 22.14
- Backend rodando via Docker Compose:
  ```bash
  docker compose up -d --build postgresql keycloak oauth rooms classes bff
  ```

### Executar a SPA localmente (`ng serve`):
1. Instale as dependências:
   ```bash
   npm ci
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   ```
   O app estará disponível em `http://localhost:8080`.

> **Atenção:** O container `frontend` do Docker Compose publica na porta 8080 do host. Portanto, para rodar `npm start` localmente, garanta que o container `frontend` não esteja ativo para evitar conflito na porta 8080:
> ```bash
> docker compose stop frontend
> ```

---

## 4. Testes e Build

### Testes unitários
```bash
npm test
# ou: npx ng test --watch=false
```

### Build de produção
```bash
npm run build
# ou: npx ng build --configuration production
```

Os artefatos compilados são gerados em `dist/frontend/browser`.

---

## 5. Build e Execução com Docker

O frontend possui Dockerfile multi-stage com suporte aos build args `VITE_OAUTH_BASE_URL` e `VITE_BFF_BASE_URL`:

```bash
docker build -t constrsw/frontend \
  --build-arg VITE_OAUTH_BASE_URL=/api/auth \
  --build-arg VITE_BFF_BASE_URL=/api/bff \
  .
```

Para rodar via Docker Compose na raiz do repositório base:
```bash
docker compose up -d --build frontend
```

Healthcheck:
```bash
curl -f http://localhost:8080/health
```

---

## 6. Convenções de Código e Navegação

- **Rotas:** `/login`, `/salas`, `/salas/:id` e `/em-breve/:slug`.
- **Navegação Shell:** 10 itens fixos. Em telas `≥ 1024px`, o drawer é fixo (`mode="side"`). Em telas `< 1024px`, o drawer se comporta como folha modal (`mode="over"`), com botão de menu, fechamento por `Esc` ou clique fora, e retorno de foco.
- **Autenticação e Sessão:** O navegador nunca armazena o token em `localStorage` ou `sessionStorage`. A autenticação ocorre por cookie httpOnly emitido pelo oauth e transmitido ao BFF.
