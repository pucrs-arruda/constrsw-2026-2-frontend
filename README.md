# frontend

SPA Angular Closed CRAS — ConstrSW 2026/2.

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

## Mockups

Galeria PNG (25 frames) + amostra responsiva compact/medium:

→ **[mockups/README.md](mockups/README.md)**

Figma (só leitura): https://www.figma.com/design/FTSWNiR5rQHXqDizXFJYqp

## Disciplinas · Grupo 05

Acesse `/disciplinas` pelo menu. O catálogo consulta o BFF e o detalhe reúne ementa, bibliografia, itens do plano e turmas do semestre. Os formulários usam a sessão HTTP do OAuth.

### Rodar e testar

Com OAuth, BFF, Courses, Classes e suas dependências disponíveis, execute no repositório frontend:

```sh
npm ci
npm start -- --port 4200
```

Abra `http://localhost:4200/disciplinas`. A origem da SPA deve coincidir com `BFF_ORIGIN` para escritas com cookie. Nesta base do shell, o login da interface ainda é simulado. O E2E obtém a sessão real pelo proxy de OAuth e acessa Disciplinas pelo menu.

Para a jornada de navegador, defina `E2E_USERNAME` e `E2E_PASSWORD` no ambiente. Com a SPA rodando:

```sh
npx playwright install chromium
npm run e2e:courses
```

O teste cria uma disciplina temporária e a exclui ao terminar. Use `E2E_FRONTEND_URL` se a origem for diferente de `http://localhost:4200` e `E2E_BROWSER_CHANNEL=chrome` para usar o Chrome instalado. Para os testes unitários, execute `npm test -- --watch=false`.
