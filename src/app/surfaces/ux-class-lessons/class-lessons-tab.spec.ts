import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { IdentityApi } from '../../shell/identity-api';
import { ClassItem } from '../ux-classes/data/classes.models';
import { ClassLessonsTab } from './class-lessons-tab';
import { LessonsApiService } from './data/lessons-api.service';

const turma: ClassItem = { id: 'c', courseId: 'course', professorId: 'p', roomId: 'r', startDate: '2026-11-01',
  endDate: '2026-11-30', enabled: true, year: 2026, semester: 2, seats: 40, studentIds: [], status: 'active' };

describe('Aba de Aulas', () => {
  const list = vi.fn(), generate = vi.fn();
  const open = vi.fn();
  function setup(roles = ['coordinator']) {
    list.mockReset().mockReturnValue(of([])); generate.mockReset().mockReturnValue(of([]));
    open.mockReset().mockReturnValue({ afterClosed: () => of(true) });
    TestBed.configureTestingModule({ imports: [ClassLessonsTab], providers: [provideRouter([]), provideAnimationsAsync(),
      { provide: IdentityApi, useValue: { me: () => of({ sub: 'u', papeis: roles }) } },
      { provide: LessonsApiService, useValue: { list, generate } }, { provide: MatDialog, useValue: { open } },
    ] });
    const fixture = TestBed.createComponent(ClassLessonsTab); fixture.componentRef.setInput('classItem', turma);
    fixture.detectChanges(); return fixture;
  }
  it('mostra o estado vazio e carrega apenas a turma atual', () => {
    const fixture = setup(); fixture.detectChanges();
    expect(list).toHaveBeenCalledWith('c');
    expect(fixture.nativeElement.textContent).toContain('Nenhuma aula cadastrada');
  });
  it('atualiza a lista depois de confirmar a geração', () => {
    const fixture = setup(); fixture.componentInstance.generate();
    expect(generate).toHaveBeenCalledWith('c'); expect(list).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.notice()).toBe('Aulas geradas.');
  });
  it('não mostra nem dispara geração para aluno', () => {
    const fixture = setup(['student']); fixture.componentInstance.generate();
    expect(generate).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Gerar aulas');
  });
  it('exibe a recusa de geração e não anuncia sucesso', () => {
    const fixture = setup(); generate.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error_description: 'Turma já gerada.' } })));
    fixture.componentInstance.generate(); fixture.detectChanges();
    expect(fixture.componentInstance.error()?.message).toBe('Turma já gerada.');
    expect(fixture.componentInstance.notice()).toBe('');
  });
});
