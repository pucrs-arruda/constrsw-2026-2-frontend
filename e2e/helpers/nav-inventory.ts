/**
 * Rotas que ainda apontam para o `SurfacePlaceholder` em `app.routes` — só smoke de navegação.
 *
 * Quando uma superfície entra, a linha dela sai daqui e o próprio grupo passa a cobrir a tela.
 * Já saíram: `/salas` (UX-ROOMS, Grupo 08) e `/turmas` (UX-CLASSES, Grupo 01).
 */
export const NAV_PLACEHOLDERS = [
  { path: '/professores', label: 'Professores' },
  { path: '/alunos', label: 'Alunos' },
  { path: '/recursos', label: 'Recursos' },
  { path: '/disciplinas', label: 'Disciplinas' },
  { path: '/ocupacao', label: 'Ocupação' },
  { path: '/plano-roster', label: 'Plano + roster' },
  { path: '/minhas-aulas', label: 'Minhas aulas' },
] as const;
