import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { LessonsApiService } from './data/lessons-api.service';
import { TopicFormDialog } from './topic-form.dialog';

describe('Formulário de tópico', () => {
  const createTopic = vi.fn(), close = vi.fn();
  function setup(unavailable = false) {
    createTopic.mockReset().mockReturnValue(of({ id: 't' })); close.mockReset();
    TestBed.configureTestingModule({ imports: [TopicFormDialog], providers: [provideAnimationsAsync(),
      { provide: MAT_DIALOG_DATA, useValue: { lessonId: 'l', courseId: 'c', nextOrder: 1 } },
      { provide: MatDialogRef, useValue: { close, disableClose: false } },
      { provide: LessonsApiService, useValue: { createTopic, syllabus: () => unavailable ? throwError(() => new Error('offline')) : of([]) } },
    ] });
    const fixture = TestBed.createComponent(TopicFormDialog); fixture.detectChanges(); return fixture.componentInstance;
  }
  it('exige enunciado ou item do plano de ensino', () => {
    const form = setup(); form.form.patchValue({ statement: '   ' }); form.save();
    expect(createTopic).not.toHaveBeenCalled(); expect(form.error()?.message).toContain('enunciado');
  });
  it('permite texto livre quando o catálogo está indisponível', () => {
    const form = setup(true); form.form.patchValue({ statement: '  Revisão  ' }); form.save();
    expect(form.syllabusUnavailable()).toBe(true);
    expect(createTopic).toHaveBeenCalledWith('l', { order: 1, statement: 'Revisão' });
  });
  it('não envia ordem fracionária', () => {
    const form = setup(); form.form.patchValue({ order: 1.5, statement: 'Conteúdo' }); form.save();
    expect(createTopic).not.toHaveBeenCalled(); expect(form.form.controls.order.invalid).toBe(true);
  });
});
