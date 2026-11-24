# Closed CRAS — Frontend (Grupo 08)

Interface Web SPA do sistema Closed CRAS desenvolvida para a disciplina ConstrSW 2026/2 (PUCRS).

## Contrato e Superfícies (`spec-frontend`)

Pacote SPEC:

```text
_bmad-output/specs/spec-frontend/SPEC.md
_bmad-output/specs/spec-frontend/surfaces.md
_bmad-output/specs/spec-frontend/ownership.md
_bmad-output/specs/spec-frontend/contribution.md
_bmad-output/specs/spec-frontend/stack.md
_bmad-output/specs/spec-frontend/traceability.md
```

Companions de UX: `EXPERIENCE.md` + `DESIGN.md` em `_bmad-output/planning-artifacts/ux-designs/ux-constrsw-2026-2-2026-11-23/`.
Galeria PNG (25 frames) + amostra responsiva compact/medium: **[mockups/README.md](mockups/README.md)**.

| Superfície | Dono |
|---|---|
| UX-LOGIN, UX-HOME, UX-EMPLOYEES | Prof. Arruda |
| UX-CLASSES, UX-CLASS-ENROLLMENTS | Grupo 01 (`classes`) |
| UX-CLASS-LESSONS | Grupo 02 (`lessons`) |
| UX-LESSON-RESERVATIONS, UX-OCCUPANCY | Grupo 03 (`reservations`) |
| UX-STUDENTS, UX-STUDENT-READ | Grupo 04 (`students`) |
| UX-COURSES | Grupo 05 (`courses`) |
| UX-RESOURCES | Grupo 06 (`resources`) |
| UX-PROFESSORS, UX-PROFESSOR-VIEW | Grupo 07 (`professors`) |
| UX-ROOMS | Grupo 08 (`rooms`) |

> **Nota sobre Ownership e Scaffold Provisório (`spec-frontend/ownership.md`):**
> O **Grupo 08 é dono exclusivamente da superfície `UX-ROOMS`** (`src/app/surfaces/ux-rooms/`).
> De acordo com o contrato (`ownership.md`), o scaffold Angular, o shell (`UX-HOME`, app bar, menu lateral), a tela de login (`UX-LOGIN`), `UX-EMPLOYEES` e o kit compartilhado de UI pertencem ao **Prof. Arruda** (Epic 0). Como o Epic 0 ainda não foi publicado em `origin/main`, todo o código criado pelo Grupo 08 fora de `src/app/surfaces/ux-rooms/` (`src/app/shell/`, `src/app/shared/`, `src/app/auth/`, configurações raiz e estilos base) constitui **scaffold provisório** para viabilizar o desenvolvimento, os testes e a execução autônoma da superfície `UX-ROOMS`, sem reivindicar autoria sobre `UX-LOGIN` ou `UX-HOME`. Quando o scaffold oficial do Prof. Arruda for publicado, a superfície `src/app/surfaces/ux-rooms/` (exportando `ROOMS_ROUTES` via `loadChildren`) será plugada diretamente nele.

---

## Tecnologias e Stack
- **Framework:** Angular 22.x (standalone components, routing, signals)
- **Componentes:** Angular Material M3 (Material Design 3) + Angular CDK
- **Estilos:** SCSS modularizado com design tokens PUCRS (`_tokens.scss`, `_theme.scss`, `_typography.scss`)
- **Fontes:** Source Sans 3, Source Code Pro e Material Symbols Outlined self-hosted via pacotes `@fontsource` (zero dependência de CDN externo em runtime)
- **Localização:** `pt-BR` nativo com `registerLocaleData`
- **Servidor Web e Proxy de Produção:** Nginx Alpine com reverse proxy para OAuth e BFF

---

## Estrutura de Pastas

A estrutura segue a convenção da Seção 0.2 do plano e de `spec-frontend/contribution.md`:

```text
frontend/
├── Dockerfile
├── nginx.conf
├── proxy.conf.json
├── .dockerignore
├── README.md
├── angular.json, package.json, tsconfig*.json
├── public/
│   └── config.json                       (Configuração de runtime gerada no build)
└── src/
    ├── main.ts
    ├── index.html
    ├── styles.scss                       (Estilos globais, métricas travadas M3)
    ├── styles/                           (_tokens.scss, _theme.scss, _typography.scss)
    └── app/
        ├── app.config.ts                 (Providers globais: Router, HttpClient, LOCALE_ID pt-BR, APP_CONFIG)
        ├── app.routes.ts                 (Rotas raiz; registra /salas com loadChildren -> ROOMS_ROUTES)
        ├── app.component.ts              (Componente raiz)
        ├── shell/                        (PROVISÓRIO — Prof. Arruda: app-shell, app-bar 64dp, nav-drawer 280px, login, home, placeholder)
        ├── auth/                         (PROVISÓRIO — Prof. Arruda: auth.service.ts, auth.interceptor.ts, auth.guard.ts, identity.model.ts)
        ├── shared/                       (PROVISÓRIO — Prof. Arruda: kit compartilhado)
        │   ├── config/app-config.ts      (Token APP_CONFIG e interface)
        │   ├── http/                     (Tradução de erros e filtros: AG-06)
        │   └── ui/                       (ConfirmDialog, RefusalBanner, ErrorBanner, Skeleton, EmptyState)
        └── surfaces/
            └── ux-rooms/                 (GRUPO 08 — Dono oficial: UX-ROOMS)
                ├── ux-rooms.routes.ts    (Exporta ROOMS_ROUTES carregado via loadChildren em /salas)
                ├── data/                 (Modelos e cliente HTTP de salas: AG-06)
                ├── list/                 (Lista de salas e dialog de formulário: AG-07)
                └── detail/               (Detalhe da sala, turmas e recursos de acessibilidade: AG-08)
```

---

## Como Executar Localmente

### Pré-requisitos (Node.js)
O Angular CLI 22.3 exige uma versão do **Node.js** compatível:
- **Node.js `^22.22.3`**, **`^24.15.0`** ou **`>=26.0.0`** (versões anteriores como `22.14.0` são recusadas pelo CLI).
- Caso sua máquina local tenha uma versão anterior do Node 22 instalada, utilize `nvm use 24` (ou `22.22.3+`) ou execute o build/testes via container Docker (`node:24-alpine`, já configurado no `Dockerfile`).

### 1. Instalar dependências
```bash
cd frontend
npm ci
```

### 2. Executar em modo desenvolvimento (`ng serve`)
> **Atenção:** O `ng serve` roda na porta **8080** configurada com proxy reverso (`proxy.conf.json`) redirecionando `/api/auth` para `http://localhost:8181` (OAuth) e `/api/bff` para `http://localhost:8180` (BFF). O container frontend do Docker Compose **não deve** estar em execução ao mesmo tempo na porta 8080 para evitar conflito de portas.

```bash
npm start
```
Acesse a aplicação em [http://localhost:8080](http://localhost:8080).

### 3. Executar testes unitários
```bash
npm test
```
Os testes são executados com Vitest (test runner nativo do Angular 22).

### 4. Compilar para produção
```bash
npm run build
```
Os artefatos compilados serão gerados em `dist/frontend/browser`.

---

## Execução via Docker e Docker Compose

O frontend possui um `Dockerfile` multi-stage:
1. **Estágio de build (`node:24-alpine`):** Compila a aplicação Angular para produção e injeta as variáveis de ambiente `VITE_OAUTH_BASE_URL` e `VITE_BFF_BASE_URL` no arquivo `public/config.json`.
2. **Estágio de runtime (`nginx:alpine`):** Serve os arquivos estáticos e atua como proxy reverso para `/api/auth/` (`http://oauth:8088`) e `/api/bff/` (`http://api:3001`), além de expor o healthcheck em `/health`.

### Build da imagem Docker isolada:
```bash
docker build -t constrsw/frontend \
  --build-arg VITE_OAUTH_BASE_URL=/api/auth \
  --build-arg VITE_BFF_BASE_URL=/api/bff .
```

### Subir no Docker Compose a partir da raiz:
```bash
docker compose up -d --build frontend
```

---

## Convenções de Código, Responsividade e Design Tokens
- **Design Tokens:** Definidos em `src/styles/_tokens.scss` e `_theme.scss` a partir do `DESIGN.md`.
- **Classes de janela (`EXPERIENCE.md` / Seção 0.4):**
  - `Compact`: `360–599px` (drawer modal; caption e e-mail ocultos na app bar, mantendo hambúrguer, marca, avatar e botão Sair)
  - `Medium`: `600–1279px` (drawer modal abaixo de `1024px` e drawer fixo de `280px` a partir de `1024px`)
  - `Expanded`: `>= 1280px` (drawer fixo de `280px`, tabela completa e master-detail em 2 colunas)
- **Métricas Material M3:**
  - App bar: 64dp com faixa tertiary de 4dp
  - Botões (filled, outlined, text): altura fixa de 40dp e border-radius de 20px (alvo de toque >= 48px em compact/medium)
  - Inputs: altura de 56dp
  - Tabela: cabeçalho 48dp, linhas 52dp
- **Acessibilidade:** WCAG 2.2 AA, atributos `role="alert"`, navegação por teclado (Esc fecha drawer modal e devolve o foco ao botão de menu).
