import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertBanner, EditDialogLayout } from '../../../shared/ui';
import { ClassesApiService } from '../data/classes-api.service';
import {
  ClassCreatePayload,
  ClassItem,
  ClassPatchPayload,
  ClassStatus,
  ClassesLookups,
  LookupDomain,
  UiErrorState,
  currentAcademicPeriod,
  extractProblemUiError,
  formatProfessorLabel,
  professorIdOf,
} from '../data/classes.models';

export interface ClassFormDialogData {
  mode: 'create' | 'edit';
  classItem?: ClassItem;
  lookups: ClassesLookups;
}

const DOMAIN_LABELS: Record<LookupDomain, string> = {
  courses: 'Disciplinas',
  professors: 'Professores',
  rooms: 'Salas',
};

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as string | null | undefined;
  const end = group.get('endDate')?.value as string | null | undefined;
  if (start && end && start > end) {
    return { dateRange: true };
  }
  return null;
}

@Component({
  selector: 'app-class-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    EditDialogLayout,
    AlertBanner,
  ],
  templateUrl: './class-form.dialog.html',
  styleUrl: './class-form.dialog.scss',
})
export class ClassFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ClassesApiService);
  private readonly dialogRef = inject(
    MatDialogRef<ClassFormDialog, ClassItem | undefined>,
  );
  readonly data = inject<ClassFormDialogData>(MAT_DIALOG_DATA);

  readonly isEdit = this.data.mode === 'edit' && Boolean(this.data.classItem);
  readonly saving = signal(false);
  readonly submitError = signal<UiErrorState | null>(null);

  readonly courses = this.data.lookups.courses;
  readonly professors = this.data.lookups.professors;
  readonly rooms = this.data.lookups.rooms;

  readonly unavailableMessage: string | null = (() => {
    const missing = this.data.lookups.unavailable ?? [];
    if (missing.length === 0) {
      return null;
    }
    const labels = missing.map((d) => DOMAIN_LABELS[d]).join(', ');
    return `Catálogos indisponíveis no BFF no momento: ${labels}. Suba os serviços correspondentes para listar os registros existentes.`;
  })();

  readonly currentCourseMissing =
    Boolean(this.data.classItem?.courseId) &&
    !this.courses.some((c) => c.id === this.data.classItem?.courseId);

  readonly currentProfessorMissing =
    Boolean(this.data.classItem?.professorId) &&
    !this.professors.some(
      (p) => professorIdOf(p) === this.data.classItem?.professorId,
    );

  readonly currentRoomMissing =
    Boolean(this.data.classItem?.roomId) &&
    !this.rooms.some((r) => r.id === this.data.classItem?.roomId);

  readonly defaultPeriod = currentAcademicPeriod();
  readonly defaultDates =
    this.defaultPeriod.semester === 1
      ? {
          start: `${this.defaultPeriod.year}-03-01`,
          end: `${this.defaultPeriod.year}-07-15`,
        }
      : {
          start: `${this.defaultPeriod.year}-08-01`,
          end: `${this.defaultPeriod.year}-12-15`,
        };

  readonly form = this.fb.group(
    {
      code: [
        this.data.classItem?.code ?? '',
        [Validators.maxLength(64)],
      ],
      label: [
        this.data.classItem?.label ?? '',
        [Validators.maxLength(255)],
      ],
      courseId: [
        {
          value: this.data.classItem?.courseId ?? '',
          disabled: this.isEdit,
        },
        [Validators.required],
      ],
      professorId: [
        this.data.classItem?.professorId ?? '',
        [Validators.required],
      ],
      roomId: [
        this.data.classItem?.roomId ?? '',
        [Validators.required],
      ],
      year: [
        {
          value: this.data.classItem?.year ?? this.defaultPeriod.year,
          disabled: this.isEdit,
        },
        [Validators.required, Validators.min(2000), Validators.max(2100)],
      ],
      semester: [
        {
          value: (this.data.classItem?.semester ?? this.defaultPeriod.semester) as 1 | 2,
          disabled: this.isEdit,
        },
        [Validators.required],
      ],
      startDate: [
        {
          value: this.data.classItem?.startDate ?? this.defaultDates.start,
          disabled: this.isEdit,
        },
        [Validators.required],
      ],
      endDate: [
        {
          value: this.data.classItem?.endDate ?? this.defaultDates.end,
          disabled: this.isEdit,
        },
        [Validators.required],
      ],
      seats: [
        this.data.classItem?.seats ?? 30,
        [Validators.required, Validators.min(1)],
      ],
      modality: [this.data.classItem?.modality ?? 'presencial'],
      status: [(this.data.classItem?.status ?? 'active') as ClassStatus],
    },
    { validators: [dateRangeValidator] },
  );

  readonly selectedProfessorInactive = computed(() => {
    const id = this.form.controls.professorId.value;
    if (!id) {
      return false;
    }
    const found = this.professors.find((p) => professorIdOf(p) === id);
    return found ? !found.active : false;
  });

  readonly professorIdOf = professorIdOf;

  professorOptionLabel(prof: ClassesLookups['professors'][number]): string {
    return formatProfessorLabel(professorIdOf(prof), this.professors);
  }

  onSubmit(): void {
    this.submitError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);

    if (this.isEdit && this.data.classItem) {
      const payload: ClassPatchPayload = {
        seats: Number(raw.seats),
        roomId: raw.roomId?.trim() ?? '',
        professorId: raw.professorId?.trim() ?? '',
        code: raw.code?.trim() ? raw.code.trim() : null,
        label: raw.label?.trim() ? raw.label.trim() : null,
        modality: raw.modality?.trim() ? raw.modality.trim() : null,
        status: (raw.status ?? 'active') as ClassStatus,
      };

      this.api.patchClass(this.data.classItem.id, payload).subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.dialogRef.close(updated);
        },
        error: (err) => {
          this.saving.set(false);
          this.submitError.set(
            extractProblemUiError(
              err,
              'Não foi possível salvar a turma. Verifique os dados e tente novamente.',
            ),
          );
        },
      });
      return;
    }

    const payload: ClassCreatePayload = {
      courseId: raw.courseId?.trim() ?? '',
      professorId: raw.professorId?.trim() ?? '',
      roomId: raw.roomId?.trim() ?? '',
      year: Number(raw.year),
      semester: Number(raw.semester) as 1 | 2,
      startDate: raw.startDate ?? '',
      endDate: raw.endDate ?? '',
      seats: Number(raw.seats),
      studentIds: [],
      ...(raw.code?.trim() ? { code: raw.code.trim() } : {}),
      ...(raw.label?.trim() ? { label: raw.label.trim() } : {}),
      ...(raw.modality?.trim() ? { modality: raw.modality.trim() } : {}),
    };

    this.api.createClass(payload).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.saving.set(false);
        this.submitError.set(
          extractProblemUiError(
            err,
            'Não foi possível abrir a turma. Verifique conflitos, sala e professor.',
          ),
        );
      },
    });
  }
}
