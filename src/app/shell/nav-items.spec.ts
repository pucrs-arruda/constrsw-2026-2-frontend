import { NAV_ITEMS } from './nav-items';

describe('NAV_ITEMS', () => {
  it('exports the fixed 10-item order and labels', () => {
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
  });
});
