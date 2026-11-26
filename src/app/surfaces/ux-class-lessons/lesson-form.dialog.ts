import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AlertBanner, EditDialogLayout } from '../../shared/ui';
import { ClassItem } from '../ux-classes/data/classes.models';
import { LessonsApiService } from './data/lessons-api.service';
import { Lesson, LessonModality, LessonUiError, TIME_SLOTS, lessonError, validLessonDate } from './data/lessons.models';

export interface LessonFormData { classItem: ClassItem; lesson?: Lesson }

@Component({
  selector: 'app-lesson-form-dialog', standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatCheckboxModule, EditDialogLayout, AlertBanner],
  templateUrl: './lesson-form.dialog.html', styleUrl: './lesson-form.dialog.scss',
})
export class LessonFormDialog {
  readonly data = inject<LessonFormData>(MAT_DIALOG_DATA);
  private readonly api = inject(LessonsApiService);
  private readonly ref = inject(MatDialogRef<LessonFormDialog, Lesson>);
  private readonly fb = inject(FormBuilder);
  readonly slots = TIME_SLOTS;
  readonly saving = signal(false);
  readonly error = signal<LessonUiError | null>(null);
  readonly form = this.fb.nonNullable.group({
    date: [this.data.lesson?.date ?? '', Validators.required],
    timeSlotId: [this.data.lesson?.timeSlotId ?? '', Validators.required],
    modality: [this.data.lesson?.modality ?? 'IN_PERSON' as LessonModality, Validators.required],
    hasAssessment: [this.data.lesson?.hasAssessment ?? false],
  });

  constructor() {
    if (this.data.lesson) {
      this.form.controls.date.disable();
      this.form.controls.timeSlotId.disable();
    }
  }

  save(): void {
    if (this.saving()) return;
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (!this.data.lesson && (!validLessonDate(value.date, this.data.classItem.startDate, this.data.classItem.endDate)
      || !TIME_SLOTS.includes(value.timeSlotId))) {
      this.error.set({ kind: 'refusal', message: 'Escolha uma data de segunda a sábado dentro do período da turma e uma faixa válida.' });
      return;
    }
    this.saving.set(true);
    this.ref.disableClose = true;
    const request = this.data.lesson
      ? this.api.update(this.data.lesson.id, { modality: value.modality, hasAssessment: value.hasAssessment })
      : this.api.create({ ...value, classId: this.data.classItem.id });
    request.subscribe({
      next: lesson => this.ref.close(lesson),
      error: error => { this.saving.set(false); this.ref.disableClose = false; this.error.set(lessonError(error)); },
    });
  }
}
