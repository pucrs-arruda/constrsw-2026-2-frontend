export interface NavItem {
  label: string;
  route: string;
  icon: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Funcionários', route: '/em-breve/funcionarios', icon: 'badge' },
  { label: 'Professores', route: '/em-breve/professores', icon: 'school' },
  { label: 'Alunos', route: '/em-breve/alunos', icon: 'person' },
  { label: 'Salas de Aula', route: '/salas', icon: 'meeting_room' },
  { label: 'Recursos', route: '/em-breve/recursos', icon: 'inventory_2' },
  { label: 'Disciplinas', route: '/em-breve/disciplinas', icon: 'menu_book' },
  { label: 'Turmas', route: '/em-breve/turmas', icon: 'groups' },
  { label: 'Ocupação', route: '/em-breve/ocupacao', icon: 'calendar_month' },
  { label: 'Plano + roster', route: '/em-breve/plano-roster', icon: 'assignment' },
  { label: 'Minhas aulas', route: '/em-breve/minhas-aulas', icon: 'class' },
] as const;
