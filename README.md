# frontend

SPA Angular Closed CRAS — ConstrSW 2026/2.

Stack: **Angular 22.x** + Angular Material (M3) + CDK + SCSS. Tema: tokens `DESIGN.md` (primary `#0066B3`). Em desenvolvimento (`npm start`): porta **4200**. Pelo Compose: porta de `FRONTEND_EXTERNAL_PORT` (**4200** no `.env` do repositório base).

```bash
npm ci
npm start          # ng serve --port 4200
npm run build
```

Compose (raiz do monorepo): serviço `frontend` → `FRONTEND_EXTERNAL_PORT` (**4200** no `.env` e no padrão do `docker-compose.yml`) → container `:80` + `/health`.

## Contrato

Apontar o pacote SPEC:

```text
_bmad-output/specs/spec-frontend/SPEC.md
_bmad-output/specs/spec-frontend/surfaces.md
_bmad-output/specs/spec-frontend/ownership.md
_bmad-output/specs/spec-frontend/contribution.md
_bmad-output/specs/spec-frontend/stack.md
```

Companions de UX: EXPERIENCE + DESIGN em `_bmad-output/planning-artifacts/ux-designs/ux-constrsw-2026-2-2026-11-23/`.

## Donos de superfície (OQ-1 fechada)

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

Mapa canônico: `_bmad-output/specs/spec-frontend/ownership.md`.

## UX-ROOMS (Grupo 08)

Superfície de salas, em `src/app/surfaces/ux-rooms/`:

```text
data/    RoomsApiService (BFF /api/v1/rooms), modelos, RoomsAccess (papéis),
         filter-query (operadores {like}/{gteq}) e error-parser
list/    lista com filtro, ordenação, paginação e formulário de sala
detail/  detalhe, recursos de acessibilidade e turmas do semestre (T3)
```

Entra no shell por uma linha só em `app.routes.ts`: `/salas` carrega
`ROOMS_ROUTES` com `loadChildren`. Lista e detalhe saem em chunks próprios.

**Composição T3.** Os dois GETs de sala vêm do BFF já com `classes` do semestre
em curso; o cliente nunca manda `year`/`semester`. Se o serviço `classes` não
responde, o BFF devolve 503 e a sala **não** volta pela metade — a tela mostra o
banner de composição indisponível, com "Tentar novamente".

**Papéis.** `RoomsAccess` lê `GET /v1/identidade/me` pelo BFF só para não
oferecer botão que o servidor vai negar; quem recusa escrita é o domínio (403).
Sem identidade, a superfície fica em leitura. Como `classes` filtra por papel,
professor e aluno podem ver menos turmas do que a sala tem, e a tela avisa.

**Kit compartilhado.** A superfície usa `shared/ui` do Prof. Arruda — `AlertBanner`,
`EmptyState`, `SkeletonBlock` e `openConfirmDialog` — e o `BffClient` de `shared/http`
para as chamadas de item (sala e característica). Só as duas listas usam `HttpClient`
direto, porque o `BffClient` devolve apenas o corpo e a paginação precisa do header
`X-Total-Count`. Nada em `shared/` é nosso: os helpers de filtro e de erro da UX-ROOMS
moram em `surfaces/ux-rooms/data/`.

**Sessão expirada.** O access token do oauth dura 10 min e fica só em memória. Num 401,
`RoomsApiService` renova uma vez pelo cookie de refresh (`AuthSession.refresh()`) e repete
a chamada; se a renovação falha ou o 401 persiste, limpa a sessão e volta ao `/login`.

O banner de composição usa a cópia institucional travada pelo kit ("Serviço de
composição indisponível."), por isso a superfície não escreve essa frase.

## Mockups

Galeria PNG (25 frames) + amostra responsiva compact/medium:

→ **[mockups/README.md](mockups/README.md)**

Figma (só leitura): https://www.figma.com/design/FTSWNiR5rQHXqDizXFJYqp
