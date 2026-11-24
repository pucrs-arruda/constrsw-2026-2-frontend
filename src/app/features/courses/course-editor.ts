import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { filter, firstValueFrom, merge } from 'rxjs';
import { ConfirmDialogComponent, RefusalBannerComponent } from '../../core/ui';
import { CoursesApi, courseError, ReferenceFields, Target } from './courses.api';

const nonBlank = [Validators.required, Validators.pattern(/\S/)];
const integer = (max: number) => [
  Validators.min(1),
  Validators.max(max),
  Validators.pattern(/^\d+$/),
];

@Component({
  selector: 'app-course-editor',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    RefusalBannerComponent,
  ],
  templateUrl: './course-editor.html',
  styleUrl: './course-editor.scss',
})
export class CourseEditor {
  readonly target = inject<Target>(MAT_DIALOG_DATA);
  private readonly api = inject(CoursesApi);
  private readonly ref = inject(MatDialogRef<CourseEditor, string>);
  private readonly dialogs = inject(MatDialog);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly course = this.target.course;
  private readonly reference = this.target.kind === 'reference' ? this.target.reference : undefined;
  private readonly item = this.target.kind === 'item' ? this.target.item : undefined;
  readonly createCourse = this.target.kind === 'course' && !this.course;
  readonly hasReference = this.createCourse || this.target.kind === 'reference';
  readonly title =
    this.target.kind === 'course'
      ? this.createCourse
        ? 'Nova disciplina'
        : 'Editar disciplina'
      : this.target.kind === 'reference'
        ? this.reference
          ? 'Editar referência'
          : 'Nova referência'
        : this.item
          ? 'Editar item do plano'
          : 'Novo item do plano';
  readonly busy = signal(false);
  readonly message = signal('');
  private confirming = false;

  readonly courseForm = this.fb.group({
    code: [this.course?.code ?? '', [...nonBlank, Validators.maxLength(20)]],
    name: [this.course?.name ?? '', [...nonBlank, Validators.maxLength(200)]],
    workloadHours: this.fb.control<number | null>(this.course?.workloadHours ?? null, [
      Validators.required,
      ...integer(2147483647),
    ]),
    syllabus: [this.course?.syllabus ?? ''],
  });
  readonly referenceForm = this.fb.group({
    title: [this.reference?.title ?? '', [...nonBlank, Validators.maxLength(300)]],
    authors: [this.reference?.authors ?? '', nonBlank],
    type: this.fb.control<ReferenceFields['type']>(this.reference?.type ?? 'BASIC'),
    publisher: [this.reference?.publisher ?? '', Validators.maxLength(150)],
    year: this.fb.control<number | null>(this.reference?.year ?? null, integer(9999)),
    edition: [this.reference?.edition ?? '', Validators.maxLength(50)],
  });
  readonly itemForm = this.fb.group({
    order: [
      this.item?.order ??
        1 + Math.max(0, ...(this.course?.syllabusItems ?? []).map((i) => i.order)),
      [Validators.required, ...integer(32767)],
    ],
    kind: this.fb.control(this.item?.kind ?? 'CONTENT'),
    statement: [this.item?.statement ?? '', [...nonBlank, Validators.maxLength(2000)]],
  });

  constructor() {
    merge(
      this.ref.backdropClick(),
      this.ref.keydownEvents().pipe(filter((e) => e.key === 'Escape')),
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.cancel());
  }

  async cancel() {
    if (this.busy() || this.confirming) return;
    if (this.courseForm.dirty || this.referenceForm.dirty || this.itemForm.dirty) {
      this.confirming = true;
      const discard = await firstValueFrom(
        this.dialogs
          .open(ConfirmDialogComponent, {
            data: {
              title: 'Descartar alterações?',
              message: 'Os dados digitados neste formulário serão descartados.',
              confirmLabel: 'Descartar',
              cancelLabel: 'Continuar editando',
              destructive: true,
            },
          })
          .afterClosed(),
      );
      this.confirming = false;
      if (!discard) return;
    }
    this.ref.close();
  }

  async save() {
    if (this.busy()) return;
    const forms = [];
    if (this.target.kind === 'course') forms.push(this.courseForm);
    if (this.hasReference) forms.push(this.referenceForm);
    if (this.target.kind === 'item') forms.push(this.itemForm);
    forms.forEach((form) => form.markAllAsTouched());
    if (forms.some((form) => form.invalid)) {
      this.message.set('Confira os campos destacados antes de salvar.');
      return;
    }
    this.busy.set(true);
    this.message.set('');
    try {
      const ref = this.referenceForm.getRawValue();
      const reference: ReferenceFields = {
        title: ref.title.trim(),
        authors: ref.authors.trim(),
        type: ref.type,
        ...(ref.publisher.trim() && { publisher: ref.publisher.trim() }),
        ...(ref.year != null && { year: ref.year }),
        ...(ref.edition.trim() && { edition: ref.edition.trim() }),
      };
      let courseId = this.course?.id;
      if (this.target.kind === 'course') {
        const value = this.courseForm.getRawValue();
        const fields = {
          code: value.code.trim(),
          name: value.name.trim(),
          workloadHours: value.workloadHours!,
          ...(value.syllabus.trim() && { syllabus: value.syllabus.trim() }),
        };
        const saved = await firstValueFrom(
          courseId ? this.api.update(courseId, fields) : this.api.create(fields, reference),
        );
        courseId = saved.id;
      } else if (this.target.kind === 'reference') {
        await firstValueFrom(this.api.saveReference(courseId!, reference, this.reference?.id));
      } else {
        const value = this.itemForm.getRawValue();
        await firstValueFrom(
          this.api.saveItem(
            courseId!,
            { ...value, statement: value.statement.trim() },
            this.item?.id,
          ),
        );
      }
      this.ref.close(courseId);
    } catch (error) {
      this.message.set(courseError(error, this.target.kind, 'save'));
    } finally {
      this.busy.set(false);
    }
  }
}
