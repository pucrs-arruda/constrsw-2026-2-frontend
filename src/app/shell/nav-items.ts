/** Ordered top-nav surfaces (surfaces.md / EXPERIENCE hamburger-nav). */
export interface NavItem {
  readonly path: string;
  readonly label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/funcionarios', label: 'Funcionários' },
  { path: '/professores', label: 'Professores' },
  { path: '/alunos', label: 'Alunos' },
  { path: '/salas', label: 'Salas de Aula' },
  { path: '/recursos', label: 'Recursos' },
  { path: '/disciplinas', label: 'Disciplinas' },
  { path: '/turmas', label: 'Turmas' },
  { path: '/ocupacao', label: 'Ocupação' },
  { path: '/plano-roster', label: 'Plano + roster' },
  { path: '/minhas-aulas', label: 'Minhas aulas' },
] as const;
