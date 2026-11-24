# Closed CRAS — Frontend (Grupo 08)

Interface Web SPA do sistema Closed CRAS desenvolvida para a disciplina ConstrSW 2026/2 (PUCRS).

## Contrato e Superfícies

Pacote SPEC:

```text
_bmad-output/specs/spec-frontend/SPEC.md
_bmad-output/specs/spec-frontend/surfaces.md
_bmad-output/specs/spec-frontend/ownership.md
_bmad-output/specs/spec-frontend/contribution.md
_bmad-output/specs/spec-frontend/stack.md
```

Companions de UX: EXPERIENCE + DESIGN em `_bmad-output/planning-artifacts/ux-designs/ux-constrsw-2026-2-2026-11-23/`.
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

---

## Tecnologias e Stack
- **Framework:** Angular 22.x (standalone components, routing, signals, zoneless/zoneless-ready)
- **Componentes:** Angular Material M3 (Material Design 3) + Angular CDK
- **Estilos:** SCSS modularizado com design tokens PUCRS (`_tokens.scss`, `_theme.scss`, `_typography.scss`)
- **Fontes:** Source Sans 3, Source Code Pro e Material Symbols Outlined self-hosted via pacotes `@fontsource` (zero dependência de CDN externo em runtime)
- **Localização:** `pt-BR` nativo com `registerLocaleData`
- **Servidor Web e Proxy de Produção:** Nginx Alpine com reverse proxy para OAuth e BFF

---

## Estrutura de Pastas

A estrutura segue a arquitetura acordada na seção 6.3 do plano de orquestração:

```
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
        ├── app.routes.ts                 (Rotas com lazy loading e authGuard)
        ├── app.component.ts              (Componente raiz)
        ├── core/
        │   ├── config/app-config.ts      (Token APP_CONFIG e interface)
        │   ├── layout/                   (Shell, app-bar 64dp, nav-drawer 280px, nav-items)
        │   ├── auth/                     (Stubs AG-04; implementação real AG-05)
        │   ├── http/                     (Tradução de erros e filtros: AG-06)
        │   └── ui/                       (ConfirmDialog, RefusalBanner, ErrorBanner, Skeleton, EmptyState)
        ├── features/
        │   ├── login/                    (Página de login: AG-05)
        │   ├── home/                     (Landing autenticada simples)
        │   ├── placeholder/              (Página para módulos de outros grupos)
        │   └── rooms/
        │       ├── data/                 (Modelos e cliente HTTP de salas: AG-06)
        │       ├── list/                 (Lista de salas: AG-07)
        │       └── detail/               (Detalhe e recursos de acessibilidade: AG-08)
        └── shared/                       (Utilitários compartilhados)
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
2. **Estágio de runtime (`nginx:alpine`):** Serve os arquivos estáticos e atua como proxy reverso para `/api/auth/` (`http://oauth:8088/`) e `/api/bff/` (`http://api:3001/`), além de expor o healthcheck em `/health`.

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

## Convenções de Código e Design Tokens
- **Design Tokens:** Definidos em `src/styles/_tokens.scss` e `_theme.scss` a partir do `DESIGN.md`.
- **Métricas Material M3:**
  - App bar: 64dp com faixa tertiary de 4dp
  - Botões (filled, outlined, text): altura fixa de 40dp e border-radius de 20px
  - Inputs: altura de 56dp
  - Tabela: cabeçalho 48dp, linhas 52dp
- **Acessibilidade:** WCAG 2.2 AA, atributos `role="alert"`, navegação por teclado (Esc fecha drawer modal) e gerenciamento de foco.
