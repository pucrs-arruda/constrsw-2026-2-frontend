import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { ClassItem } from '../ux-classes/data/classes.models';
import { LessonsApiService } from './data/lessons-api.service';
import { Lesson, LessonUpdate } from './data/lessons.models';
import { LessonFormDialog } from './lesson-form.dialog';

const turma: ClassItem = { id: 'c', courseId: 'course', professorId: 'p', roomId: 'r', startDate: '2026-11-01',
  endDate: '2026-11-30', enabled: true, year: 2026, semester: 2, seats: 40, studentIds: [], status: 'active' };
const lesson: Lesson = { id: 'l', classId: 'c', date: '2026-11-04', timeSlotId: 'H', modality: 'IN_PERSON',
  hasAssessment: false, enabled: true, topics: [] };

describe('Formulário de aula', () => {
  const create = vi.fn(), update = vi.fn(), close = vi.fn();
  function setup(edit = false) {
    create.mockReset().mockReturnValue(of(lesson)); update.mockReset().mockReturnValue(of(lesson)); close.mockReset();
    TestBed.configureTestingModule({ imports: [LessonFormDialog], providers: [provideAnimationsAsync(),
      { provide: MAT_DIALOG_DATA, useValue: { classItem: turma, lesson: edit ? lesson : undefined } },
      { provide: MatDialogRef, useValue: { close, disableClose: false } },
      { provide: LessonsApiService, useValue: { create, update } },
    ] });
    const fixture = TestBed.createComponent(LessonFormDialog); fixture.detectChanges(); return fixture.componentInstance;
  }
  it('cria dentro da turma sem enviar a sala derivada', () => {
    const form = setup(); form.form.patchValue({ date: '2026-11-04', timeSlotId: 'H' }); form.save();
    expect(create).toHaveBeenCalledWith({ classId: 'c', date: '2026-11-04', timeSlotId: 'H', modality: 'IN_PERSON', hasAssessment: false });
    expect(close).toHaveBeenCalledWith(lesson);
  });
  it('recusa domingo e mantém o formulário aberto', () => {
    const form = setup(); form.form.patchValue({ date: '2026-11-08', timeSlotId: 'H' }); form.save();
    expect(create).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled(); expect(form.error()?.kind).toBe('refusal');
  });
  it('edição envia apenas os campos editáveis', () => {
    const form = setup(true); form.form.patchValue({ modality: 'REMOTE', hasAssessment: true }); form.save();
    expect(form.form.controls.date.disabled).toBe(true); expect(form.form.controls.timeSlotId.disabled).toBe(true);
    expect(update).toHaveBeenCalledWith('l', { modality: 'REMOTE', hasAssessment: true } satisfies LessonUpdate);
  });
  it('recusa 409 não fecha o diálogo nem perde os dados', () => {
    const form = setup(true);
    update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error_description: 'Aula já cadastrada.' } })));
    form.save(); expect(close).not.toHaveBeenCalled(); expect(form.error()?.message).toBe('Aula já cadastrada.');
    expect(form.saving()).toBe(false); expect(form.form.getRawValue().date).toBe('2026-11-04');
  });
});
