import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { IdentityApi } from '../../shell/identity-api';
import { ClassesApiService } from '../ux-classes/data/classes-api.service';
import { LessonsApiService } from './data/lessons-api.service';
import { LessonDetailPage } from './lesson-detail.page';

describe('Detalhe da aula', () => {
  function setup(lessonClassId = 'c', roles = ['coordinator']) {
    const params = convertToParamMap({ classId: 'c', lessonId: 'l' });
    TestBed.configureTestingModule({ imports: [LessonDetailPage], providers: [provideRouter([]), provideAnimationsAsync(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: params }, paramMap: of(params) } },
      { provide: IdentityApi, useValue: { me: () => of({ sub: 'u', papeis: roles }) } },
      { provide: MatDialog, useValue: { open: vi.fn() } },
      { provide: LessonsApiService, useValue: { get: () => of({ id: 'l', classId: lessonClassId, date: '2026-11-04', timeSlotId: 'H', modality: 'REMOTE', hasAssessment: true,
        topics: [{ id: 't2', order: 2, statement: 'Segundo' }, { id: 't1', order: 1, statement: 'Primeiro' }] }) } },
      { provide: ClassesApiService, useValue: { getClass: () => of({ id: 'c', professorId: 'p' }), loadLookups: () => of({ courses: [], rooms: [], professors: [] }) } },
    ] });
    const fixture = TestBed.createComponent(LessonDetailPage); fixture.detectChanges(); return fixture;
  }
  it('ordena tópicos e informa que a sala não se aplica a aulas remotas', () => {
    const fixture = setup();
    expect(fixture.componentInstance.topics().map(topic => topic.order)).toEqual([1, 2]);
    expect(fixture.nativeElement.textContent).toContain('Não se aplica à aula remota');
    expect(fixture.nativeElement.textContent).toContain('Com avaliação');
  });
  it('não mostra uma aula vinculada a outra turma', () => {
    const fixture = setup('outra');
    expect(fixture.componentInstance.lesson()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Esta aula não pertence à turma informada.');
  });
  it('aluno vê tópicos sem ações de escrita', () => {
    const fixture = setup('c', ['student']);
    expect(fixture.nativeElement.textContent).toContain('Primeiro');
    expect(fixture.nativeElement.textContent).not.toContain('Novo tópico');
    expect(fixture.nativeElement.textContent).not.toContain('Editar aula');
  });
});
