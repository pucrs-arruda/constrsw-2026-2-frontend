import { NAV_ITEMS } from './nav-items';

describe('NAV_ITEMS', () => {
  it('exports the fixed 10-item order, labels and icons', () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual([
      'Funcionários',
      'Professores',
      'Alunos',
      'Salas de Aula',
      'Recursos',
      'Disciplinas',
      'Turmas',
      'Ocupação',
      'Plano + roster',
      'Minhas aulas',
    ]);
    expect(NAV_ITEMS.map((i) => i.path)).toEqual([
      '/funcionarios',
      '/professores',
      '/alunos',
      '/salas',
      '/recursos',
      '/disciplinas',
      '/turmas',
      '/ocupacao',
      '/plano-roster',
      '/minhas-aulas',
    ]);
    expect(NAV_ITEMS.map((i) => i.icon)).toEqual([
      'badge',
      'school',
      'groups',
      'meeting_room',
      'inventory_2',
      'menu_book',
      'grid_view',
      'calendar_month',
      'assignment_ind',
      'auto_stories',
    ]);
    expect(NAV_ITEMS.every((i) => i.icon.length > 0)).toBe(true);
  });
});
