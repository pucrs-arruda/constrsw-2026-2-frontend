/** Ordered top-nav surfaces (surfaces.md / EXPERIENCE hamburger-nav). */
export interface NavItem {
  readonly path: string;
  readonly label: string;
  /** Material Symbols name (24dp per DESIGN.md). */
  readonly icon: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/funcionarios', label: 'Funcionários', icon: 'badge' },
  { path: '/professores', label: 'Professores', icon: 'school' },
  { path: '/alunos', label: 'Alunos', icon: 'groups' },
  { path: '/salas', label: 'Salas de Aula', icon: 'meeting_room' },
  { path: '/recursos', label: 'Recursos', icon: 'inventory_2' },
  { path: '/disciplinas', label: 'Disciplinas', icon: 'menu_book' },
  { path: '/turmas', label: 'Turmas', icon: 'grid_view' },
  { path: '/ocupacao', label: 'Ocupação', icon: 'calendar_month' },
  { path: '/plano-roster', label: 'Plano + roster', icon: 'assignment_ind' },
  { path: '/minhas-aulas', label: 'Minhas aulas', icon: 'auto_stories' },
] as const;
