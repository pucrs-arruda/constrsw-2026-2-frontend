import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertBanner, EditDialogLayout } from '../../shared/ui';
import { LessonsApiService } from './data/lessons-api.service';
import { LessonTopic, LessonUiError, SyllabusItem, TopicInput, lessonError } from './data/lessons.models';

export interface TopicFormData { lessonId: string; courseId: string; nextOrder: number; topic?: LessonTopic }

@Component({
  selector: 'app-topic-form-dialog', standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, EditDialogLayout, AlertBanner],
  templateUrl: './topic-form.dialog.html', styleUrl: './lesson-form.dialog.scss',
})
export class TopicFormDialog {
  readonly data = inject<TopicFormData>(MAT_DIALOG_DATA);
  private readonly api = inject(LessonsApiService);
  private readonly ref = inject(MatDialogRef<TopicFormDialog, LessonTopic>);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly saving = signal(false);
  readonly error = signal<LessonUiError | null>(null);
  readonly syllabus = signal<SyllabusItem[]>([]);
  readonly syllabusUnavailable = signal(false);
  readonly form = this.fb.nonNullable.group({
    order: [this.data.topic?.order ?? this.data.nextOrder, [Validators.required, Validators.min(1), Validators.max(32767), Validators.pattern(/^\d+$/)]],
    statement: [this.data.topic?.statement ?? ''],
    syllabusItemId: [this.data.topic?.syllabusItemId ?? ''],
  });
  constructor() {
    this.api.syllabus(this.data.courseId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => this.syllabus.set(items), error: () => this.syllabusUnavailable.set(true),
    });
  }
  hasLinkedItem(): boolean { return this.syllabus().some(item => item.id === this.data.topic?.syllabusItemId); }
  save(): void {
    if (this.saving()) return;
    this.error.set(null); this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const body: TopicInput = { order: Number(value.order) };
    if (value.statement.trim()) body.statement = value.statement.trim();
    if (value.syllabusItemId) body.syllabusItemId = value.syllabusItemId;
    if (!body.statement && !body.syllabusItemId) {
      this.error.set({ kind: 'refusal', message: 'Informe o enunciado ou selecione um item do plano de ensino.' }); return;
    }
    this.saving.set(true); this.ref.disableClose = true;
    const request = this.data.topic ? this.api.updateTopic(this.data.lessonId, this.data.topic.id, body)
      : this.api.createTopic(this.data.lessonId, body);
    request.subscribe({
      next: topic => this.ref.close(topic),
      error: error => { this.saving.set(false); this.ref.disableClose = false; this.error.set(lessonError(error)); },
    });
  }
}
